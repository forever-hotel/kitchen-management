import { EventEmitter } from 'node:events';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import type { DataSource } from 'typeorm';

// ESM mock must be registered before dynamically importing the service.
const connect = jest.fn(async (): Promise<unknown> => undefined);
jest.unstable_mockModule('amqplib', () => ({ connect }));
const { OrderReadyOutboxService } =
  await import('./order-ready-outbox.service.js');

const foodOrderId = 'c4cb0f05-0021-51a4-8a5f-5715b04044fe';
const row = {
  foodOrderId,
  roomNumber: '204',
  occurredAt: '2026-11-08T12:00:00.000Z',
};

function setup(items = [row]) {
  const query = jest.fn(async (sql: string) =>
    sql.includes('SELECT food_order_id') ? items : [],
  );
  const database = {
    transaction: async (
      callback: (manager: { query: typeof query }) => Promise<unknown>,
    ) => callback({ query }),
  } as unknown as DataSource;
  const config = {
    get: (key: string) => {
      if (key === 'KMS_ORDER_READY_ENABLED') return 'true';
      if (key === 'KMS_RABBITMQ_URL') return 'amqp://localhost:5672';
      return undefined;
    },
  } as unknown as ConfigService;
  const channel = Object.assign(new EventEmitter(), {
    assertExchange: jest.fn(async () => undefined),
    waitForConfirms: jest.fn(async () => undefined),
    publish: jest.fn(() => true),
    close: jest.fn(async () => undefined),
  });
  const connection = Object.assign(new EventEmitter(), {
    createConfirmChannel: jest.fn(async () => channel),
    close: jest.fn(async () => undefined),
  });
  connect.mockResolvedValue(connection);
  const service = new OrderReadyOutboxService(database, config);
  return { service, query, channel, connection };
}

describe('Confirmed order-ready AMQP transport lifecycle', () => {
  beforeEach(() => {
    connect.mockClear();
  });

  it('opens a confirmed connection, asserts a durable topic exchange, and publishes the event', async () => {
    const f = setup();
    await f.service.flush();
    expect(connect).toHaveBeenCalledWith('amqp://localhost:5672', {
      timeout: 5000,
    });
    expect(f.connection.createConfirmChannel).toHaveBeenCalledTimes(1);
    expect(f.channel.assertExchange).toHaveBeenCalledWith(
      'forever.events',
      'topic',
      { durable: true },
    );
    expect(f.channel.publish).toHaveBeenCalledTimes(1);
    await f.service.onModuleDestroy();
    expect(f.channel.close).toHaveBeenCalledTimes(1);
    expect(f.connection.close).toHaveBeenCalledTimes(1);
  });

  it('reuses the confirmed channel for multiple events in the same transaction', async () => {
    const second = {
      ...row,
      foodOrderId: '10e394a6-a4e2-4d77-bbc6-3a2c8df27a29',
    };
    const f = setup([row, second]);
    await f.service.flush();
    expect(connect).toHaveBeenCalledTimes(1);
    expect(f.channel.publish).toHaveBeenCalledTimes(2);
    await f.service.onModuleDestroy();
  });

  it('clears stale channel references after the broker closes the channel', async () => {
    const f = setup();
    await f.service.flush();
    f.channel.emit('close');
    await f.service.flush();
    expect(connect).toHaveBeenCalledTimes(2);
    await f.service.onModuleDestroy();
  });

  it('clears connection and channel after a remote connection close', async () => {
    const f = setup();
    await f.service.flush();
    f.connection.emit('close');
    await f.service.flush();
    expect(connect).toHaveBeenCalledTimes(2);
    await f.service.onModuleDestroy();
  });

  it('closes a failed connection and preserves pending outbox delivery', async () => {
    const f = setup();
    f.connection.createConfirmChannel.mockRejectedValueOnce(
      new Error('Cannot open channel'),
    );
    await f.service.flush();
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('next_attempt_at'),
      [foodOrderId],
    );
    expect(f.connection.close).toHaveBeenCalledTimes(1);
    await f.service.onModuleDestroy();
  });

  it('ignores connection and channel error notifications without corrupting committed event data', async () => {
    const f = setup();
    await f.service.flush();
    f.connection.emit('error', new Error('recoverable connection error'));
    f.channel.emit('error', new Error('recoverable channel error'));
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('SET published_at'),
      [foodOrderId],
    );
    await f.service.onModuleDestroy();
  });
});
