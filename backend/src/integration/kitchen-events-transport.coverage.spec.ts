import { EventEmitter } from 'node:events';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import type { DataSource } from 'typeorm';

const connect = jest.fn(async (): Promise<unknown> => undefined);
jest.unstable_mockModule('amqplib', () => ({ connect }));
const { KitchenEventsService } = await import('./kitchen-events.service.js');

function setup() {
  const query = jest.fn(async (sql: string) =>
    sql.startsWith('SELECT')
      ? [{ event_id: 'event-1', name: 'order.changed', payload: null }]
      : [],
  );
  const database = {
    transaction: async (
      work: (manager: { query: typeof query }) => Promise<unknown>,
    ) => work({ query }),
  } as unknown as DataSource;
  const config = {
    getOrThrow: (key: string) => {
      if (key === 'KMS_RABBITMQ_URL') return 'amqp://localhost:5672';
      throw new Error('Unexpected configuration key');
    },
    get: (key: string) =>
      key === 'KMS_REALTIME_ENABLED' ? 'false' : undefined,
  } as unknown as ConfigService;
  const channel = Object.assign(new EventEmitter(), {
    assertExchange: jest.fn(async () => undefined),
    publish: jest.fn(
      (
        ...[, , , , confirm]: [
          string,
          string,
          Buffer,
          unknown,
          (error: Error | null) => void,
        ]
      ) => {
        confirm(null);
        return true;
      },
    ),
  });
  const connection = Object.assign(new EventEmitter(), {
    createConfirmChannel: jest.fn(async () => channel),
    close: jest.fn(async () => undefined),
  });
  connect.mockResolvedValue(connection);
  const service = new KitchenEventsService(database, config);
  return { service, channel, connection, query };
}

describe('Realtime AMQP channel initialization and recovery', () => {
  beforeEach(() => {
    connect.mockClear();
  });

  it('creates durable realtime and integration exchanges before marking rows published', async () => {
    const f = setup();
    await f.service.flush();
    expect(connect).toHaveBeenCalledWith('amqp://localhost:5672', {
      timeout: 5000,
    });
    expect(f.channel.assertExchange).toHaveBeenCalledWith(
      'hotel.realtime',
      'topic',
      { durable: true },
    );
    expect(f.channel.assertExchange).toHaveBeenCalledWith(
      'hotel.events',
      'topic',
      { durable: true },
    );
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('published_at = now()'),
      ['event-1'],
    );
    await f.service.onModuleDestroy();
  });

  it('invalidates a broker channel when it closes so the next flush reconnects', async () => {
    const f = setup();
    await f.service.flush();
    f.channel.emit('close');
    await f.service.flush();
    expect(connect).toHaveBeenCalledTimes(2);
    await f.service.onModuleDestroy();
  });

  it('invalidates the cached channel on transport errors', async () => {
    const f = setup();
    await f.service.flush();
    f.connection.emit('error', new Error('Broker disconnected'));
    await f.service.flush();
    expect(connect).toHaveBeenCalledTimes(2);
    await f.service.onModuleDestroy();
  });

  it('handles a channel setup failure by retaining the row for the next attempt', async () => {
    const f = setup();
    f.connection.createConfirmChannel.mockRejectedValueOnce(
      new Error('Channel unavailable'),
    );
    await f.service.flush();
    expect(f.query).toHaveBeenCalledWith(
      expect.stringContaining('attempts = attempts + 1'),
      ['event-1'],
    );
    await f.service.onModuleDestroy();
  });
});
