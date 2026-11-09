import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { connect, type ChannelModel, type ConfirmChannel } from 'amqplib';
import { DataSource } from 'typeorm';

/* Sequential publishing preserves outbox order and broker confirmation before commit. */
/* eslint-disable no-await-in-loop, no-restricted-syntax */

interface PendingEvent {
  event_id: string;
  name: string;
  payload: Record<string, unknown> | null;
}

/** Transactional database triggers cover KMS writes and WKMS delivery changes alike. */
@Injectable()
export class KitchenEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KitchenEventsService.name);

  private timer?: ReturnType<typeof setInterval>;

  private busy = false;

  private stopped = false;

  private connection?: ChannelModel;

  private channel?: ConfirmChannel;

  constructor(
    @InjectDataSource() private readonly database: DataSource,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (this.config.get<string>('KMS_REALTIME_ENABLED') !== 'true') return;
    this.timer = setInterval(() => {
      this.flush().catch(() => undefined);
    }, 500);
    this.timer.unref();
    this.flush().catch(() => undefined);
  }

  async flush() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      await this.database.transaction(async (manager) => {
        const rows = await manager.query<
          PendingEvent[]
        >(`SELECT event_id, name, payload FROM kms_integration_outbox
          WHERE published_at IS NULL AND next_attempt_at <= now() ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED`);
        for (const row of rows) {
          try {
            const channel = await this.ensureChannel();
            // Stock events also feed MAD's existing versioned alert materialization.
            if (row.name === 'menu.changed' && row.payload)
              await this.publish(
                channel,
                'hotel.events',
                'kitchen.stock.changed',
                row.payload,
              );
            await this.publish(channel, 'hotel.realtime', `kms.${row.name}`, {
              subsystem: 'kms',
              name: row.name,
            });
            await manager.query(
              'UPDATE kms_integration_outbox SET published_at = now() WHERE event_id = $1',
              [row.event_id],
            );
          } catch {
            await manager.query(
              "UPDATE kms_integration_outbox SET attempts = attempts + 1, next_attempt_at = now() + interval '5 seconds' WHERE event_id = $1",
              [row.event_id],
            );
            this.channel = undefined;
            await this.connection?.close().catch(() => undefined);
            this.connection = undefined;
            break;
          }
        }
      });
    } catch {
      this.logger.warn(
        'Kitchen event outbox unavailable; retained events will be retried',
      );
    } finally {
      this.busy = false;
    }
  }

  private async ensureChannel() {
    if (this.channel) return this.channel;
    const connection = await connect(
      this.config.getOrThrow<string>('KMS_RABBITMQ_URL'),
      { timeout: 5000 },
    );
    this.connection = connection;
    connection.on('error', () => {
      this.channel = undefined;
    });
    connection.on('close', () => {
      this.channel = undefined;
    });
    const channel = await connection.createConfirmChannel();
    channel.on('error', () => {
      this.channel = undefined;
    });
    channel.on('close', () => {
      this.channel = undefined;
    });
    await channel.assertExchange('hotel.realtime', 'topic', { durable: true });
    await channel.assertExchange('hotel.events', 'topic', { durable: true });
    this.channel = channel;
    return channel;
  }

  private async publish(
    channel: ConfirmChannel,
    exchange: string,
    key: string,
    value: unknown,
  ) {
    await new Promise<void>((resolve, reject) => {
      const returned = () =>
        reject(new Error('Kitchen event has no bound consumer'));
      const timeout = setTimeout(() => {
        channel.removeListener('return', returned);
        reject(new Error('Kitchen event confirmation timed out'));
      }, 5000);
      const finish = (error?: Error | null) => {
        clearTimeout(timeout);
        channel.removeListener('return', returned);
        if (error) reject(error);
        else resolve();
      };
      channel.once('return', returned);
      channel.publish(
        exchange,
        key,
        Buffer.from(JSON.stringify(value)),
        { persistent: true, mandatory: true, contentType: 'application/json' },
        finish,
      );
    });
  }

  async onModuleDestroy() {
    this.stopped = true;
    clearInterval(this.timer);
    await this.connection?.close().catch(() => undefined);
  }
}
