/**
 * DDP-264: reads-only request coordinator for the authenticated live Order Queue.
 * The auth cookie remains on same-origin requests; no JWT enters browser storage.
 */
const DEFAULT_INTERVAL_MS = 15_000;
const MIN_INTERVAL_MS = 5_000;
const MAX_INTERVAL_MS = 60_000;

/** Configurable at Next.js build time. Invalid values safely fall back to 15 s. */
export function getQueueRefreshIntervalMs(): number {
  const raw = process.env.NEXT_PUBLIC_KMS_QUEUE_REFRESH_MS;
  if (!raw) return DEFAULT_INTERVAL_MS;
  const interval = Number(raw);
  return Number.isSafeInteger(interval) &&
    interval >= MIN_INTERVAL_MS &&
    interval <= MAX_INTERVAL_MS
    ? interval
    : DEFAULT_INTERVAL_MS;
}

/**
 * A cancelled (or superseded) response must never replace newer data, even
 * when a mocked fetch or unusual adapter does not honor AbortSignal.
 */
export class QueueRefreshCoordinator<T> {
  private active: AbortController | null = null;
  private generation = 0;
  private stopped = false;
  private expired = false;

  get isPending(): boolean {
    return this.active !== null;
  }

  get isStopped(): boolean {
    return this.stopped || this.expired;
  }

  cancelPending(): void {
    this.generation += 1;
    this.active?.abort();
    this.active = null;
  }

  expire(): void {
    this.expired = true;
    this.cancelPending();
  }

  stop(): void {
    this.stopped = true;
    this.cancelPending();
  }

  async run(
    request: (signal: AbortSignal) => Promise<T>,
    onSuccess: (value: T) => void,
    onError: (cause: unknown) => void,
    onFinished: () => void,
  ): Promise<boolean> {
    if (this.isStopped || this.isPending) return false;
    const controller = new AbortController();
    const generation = ++this.generation;
    this.active = controller;
    const isCurrent = () =>
      this.active === controller &&
      this.generation === generation &&
      !controller.signal.aborted &&
      !this.isStopped;
    try {
      const value = await request(controller.signal);
      if (!isCurrent()) return false;
      onSuccess(value);
      return true;
    } catch (cause) {
      if (!isCurrent()) return false;
      onError(cause);
      return false;
    } finally {
      if (isCurrent()) {
        this.active = null;
        onFinished();
      }
    }
  }
}
