import { getQueueRefreshIntervalMs, QueueRefreshCoordinator } from './order-queue-sync';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('DDP-264 queue refresh coordinator', () => {
  it('uses a bounded 15-second default and accepts safe build-time overrides', () => {
    const original = process.env.NEXT_PUBLIC_KMS_QUEUE_REFRESH_MS;
    try {
      delete process.env.NEXT_PUBLIC_KMS_QUEUE_REFRESH_MS;
      expect(getQueueRefreshIntervalMs()).toBe(15_000);
      process.env.NEXT_PUBLIC_KMS_QUEUE_REFRESH_MS = '5000';
      expect(getQueueRefreshIntervalMs()).toBe(5000);
      process.env.NEXT_PUBLIC_KMS_QUEUE_REFRESH_MS = '60000';
      expect(getQueueRefreshIntervalMs()).toBe(60000);
      process.env.NEXT_PUBLIC_KMS_QUEUE_REFRESH_MS = '100';
      expect(getQueueRefreshIntervalMs()).toBe(15_000);
      process.env.NEXT_PUBLIC_KMS_QUEUE_REFRESH_MS = 'NaN';
      expect(getQueueRefreshIntervalMs()).toBe(15_000);
    } finally {
      if (original === undefined) delete process.env.NEXT_PUBLIC_KMS_QUEUE_REFRESH_MS;
      else process.env.NEXT_PUBLIC_KMS_QUEUE_REFRESH_MS = original;
    }
  });

  it('prevents overlapping reads and returns the successful result', async () => {
    const gate = new QueueRefreshCoordinator<string>();
    const pending = deferred<string>();
    const request = jest.fn(() => pending.promise);
    const success = jest.fn();
    const error = jest.fn();
    const finished = jest.fn();
    const first = gate.run(request, success, error, finished);
    expect(gate.isPending).toBe(true);
    expect(await gate.run(request, success, error, finished)).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
    pending.resolve('fresh');
    expect(await first).toBe(true);
    expect(success).toHaveBeenCalledWith('fresh');
    expect(error).not.toHaveBeenCalled();
    expect(finished).toHaveBeenCalledTimes(1);
    expect(gate.isPending).toBe(false);
  });

  it('rejects late responses from superseded requests even when fetch ignores abort', async () => {
    const gate = new QueueRefreshCoordinator<string>();
    const old = deferred<string>();
    const newest = deferred<string>();
    const success = jest.fn();
    const error = jest.fn();
    const finished = jest.fn();
    let oldSignal: AbortSignal | undefined;
    const oldTask = gate.run(
      (signal) => {
        oldSignal = signal;
        return old.promise;
      },
      success,
      error,
      finished,
    );
    gate.cancelPending();
    expect(oldSignal?.aborted).toBe(true);
    const newTask = gate.run(() => newest.promise, success, error, finished);
    newest.resolve('new');
    expect(await newTask).toBe(true);
    old.resolve('old');
    expect(await oldTask).toBe(false);
    expect(success).toHaveBeenCalledTimes(1);
    expect(success).toHaveBeenCalledWith('new');
    expect(finished).toHaveBeenCalledTimes(1);
  });

  it('reports network failures, then allows a successful retry', async () => {
    const gate = new QueueRefreshCoordinator<string>();
    const success = jest.fn();
    const error = jest.fn();
    const finished = jest.fn();
    expect(
      await gate.run(
        async () => {
          throw new Error('offline');
        },
        success,
        error,
        finished,
      ),
    ).toBe(false);
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'offline' }));
    expect(await gate.run(async () => 'recovered', success, error, finished)).toBe(true);
    expect(success).toHaveBeenCalledWith('recovered');
    expect(finished).toHaveBeenCalledTimes(2);
  });

  it('cancels pending reads on unmount and prevents later requests', async () => {
    const gate = new QueueRefreshCoordinator<string>();
    const pending = deferred<string>();
    const success = jest.fn();
    const error = jest.fn();
    const finished = jest.fn();
    let signal: AbortSignal | undefined;
    const request = jest.fn((s: AbortSignal) => {
      signal = s;
      return pending.promise;
    });
    const task = gate.run(request, success, error, finished);
    gate.stop();
    expect(signal?.aborted).toBe(true);
    pending.resolve('too late');
    expect(await task).toBe(false);
    expect(await gate.run(request, success, error, finished)).toBe(false);
    expect(request).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('stops all new protected polling once the session expires', async () => {
    const gate = new QueueRefreshCoordinator<string>();
    gate.expire();
    const request = jest.fn(async () => 'unexpected');
    expect(await gate.run(request, jest.fn(), jest.fn(), jest.fn())).toBe(false);
    expect(gate.isStopped).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });
});
