import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { connect } from 'amqplib';
import type { ChannelModel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import type { DataSource, EntityManager } from 'typeorm';

const EXCHANGE = 'forever.events';
const ROUTING_KEY = 'kms.order.ready.v1';
const INTERVAL_MS = 5_000;
const CONFIRM_TIMEOUT_MS = 10_000;

interface PendingOrderReadyEvent {
  foodOrderId: string;
  roomNumber: string;
  occurredAt: string | Date;
}

export function buildOrderReadyEvent(row: PendingOrderReadyEvent) {
  return {
    eventId: `order-ready:${row.foodOrderId}`,
    eventType: 'order.ready' as const,
    eventVersion: 1 as const,
    occurredAt: new Date(row.occurredAt).toISOString(),
    source: 'kitchen-management' as const,
    data: {
      foodOrderId: row.foodOrderId,
      roomNumber: row.roomNumber,
    },
  };
}

/**
 * Transactional outbox: the READY transition and event record are committed
 * together. Publishing happens afterward, with broker confirmation and retry.
 */
@Injectable()
export class OrderReadyOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderReadyOutboxService.name);

  readonly enabled: boolean;

  private readonly rabbitUrl: string | undefined;

  private connection: ChannelModel | null = null;

  private channel: ConfirmChannel | null = null;

  private connecting: Promise<ConfirmChannel> | null = null;

  private poller: NodeJS.Timeout | null = null;

  private processing = false;

  private stopping = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    config: ConfigService,
  ) {
    this.enabled = config.get<string>('KMS_ORDER_READY_ENABLED') === 'true';
    this.rabbitUrl = config.get<string>('KMS_RABBITMQ_URL');
  }

  async record(
    manager: EntityManager,
    foodOrderId: string,
    roomNumber: string,
  ): Promise<void> {
    if (!this.enabled) return;
    await manager.query(
      `INSERT INTO kms_order_ready_outbox (food_order_id, room_number)
       VALUES ($1::uuid, $2)
       ON CONFLICT (food_order_id) DO NOTHING`,
      [foodOrderId, roomNumber],
    );
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('KMS order-ready messaging disabled');
      return;
    }
    if (!this.rabbitUrl || !/^amqps?:\/\//.test(this.rabbitUrl)) {
      throw new Error(
        'KMS_RABBITMQ_URL must be configured when KMS_ORDER_READY_ENABLED=true',
      );
    }
    this.poller = setInterval(() => {
      this.flush().catch(() => {
        this.logger.warn('Order-ready outbox flush failed; retry scheduled');
      });
    }, INTERVAL_MS);
    this.poller.unref();
    this.flush().catch(() => {
      this.logger.warn(
        'Initial order-ready outbox flush failed; retry scheduled',
      );
    });
  }

  /** Public for deterministic tests and controlled operational checks. */
  async flush(): Promise<void> {
    if (!this.enabled || this.stopping || this.processing) return;
    this.processing = true;
    try {
      await this.dataSource.transaction(async (manager) => {
        const rows = (await manager.query(
          `SELECT food_order_id::text AS "foodOrderId",
                  room_number AS "roomNumber",
                  occurred_at AS "occurredAt"
             FROM kms_order_ready_outbox
            WHERE published_at IS NULL
              AND next_attempt_at <= NOW()
            ORDER BY occurred_at ASC
            LIMIT 10
            FOR UPDATE SKIP LOCKED`,
        )) as PendingOrderReadyEvent[];
        /* eslint-disable no-restricted-syntax, no-await-in-loop -- sequential publisher confirmations */
        for (const row of rows) {
          try {
            await this.publish(row);
            await manager.query(
              `UPDATE kms_order_ready_outbox
                  SET published_at = NOW(), attempts = attempts + 1
                WHERE food_order_id = $1::uuid AND published_at IS NULL`,
              [row.foodOrderId],
            );
          } catch {
            await this.disconnect();
            await manager.query(
              `UPDATE kms_order_ready_outbox
                  SET attempts = attempts + 1,
                      next_attempt_at = NOW() + INTERVAL '30 seconds'
                WHERE food_order_id = $1::uuid AND published_at IS NULL`,
              [row.foodOrderId],
            );
            this.logger.warn(
              'Order-ready publish not confirmed; event retained for retry',
            );
            break;
          }
        }
        /* eslint-enable no-restricted-syntax, no-await-in-loop */
      });
    } finally {
      this.processing = false;
    }
  }

  private async ensureChannel(): Promise<ConfirmChannel> {
    if (this.channel) return this.channel;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      if (!this.rabbitUrl) throw new Error('RabbitMQ URL is missing');
      const connection = await connect(this.rabbitUrl, { timeout: 5_000 });
      connection.on('error', () => {
        this.logger.warn('Order-ready RabbitMQ connection error');
      });
      connection.on('close', () => {
        if (this.connection === connection) {
          this.connection = null;
          this.channel = null;
        }
      });
      try {
        const channel = await connection.createConfirmChannel();
        channel.on('error', () => {
          this.logger.warn('Order-ready RabbitMQ channel error');
        });
        channel.on('close', () => {
          if (this.channel === channel) this.channel = null;
        });
        await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
        this.connection = connection;
        this.channel = channel;
        return channel;
      } catch (error) {
        await connection.close().catch(() => undefined);
        throw error;
      }
    })();
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private async publish(row: PendingOrderReadyEvent): Promise<void> {
    const channel = await this.ensureChannel();
    const event = buildOrderReadyEvent(row);
    let returned = false;
    const onReturn = (message: ConsumeMessage) => {
      if (message.properties.messageId === event.eventId) returned = true;
    };
    channel.on('return', onReturn);
    let timeout: NodeJS.Timeout | undefined;
    try {
      channel.publish(
        EXCHANGE,
        ROUTING_KEY,
        Buffer.from(JSON.stringify(event), 'utf8'),
        {
          persistent: true,
          mandatory: true,
          contentType: 'application/json',
          contentEncoding: 'utf-8',
          messageId: event.eventId,
        },
      );
      await Promise.race([
        channel.waitForConfirms(),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error('RabbitMQ publisher confirm timed out')),
            CONFIRM_TIMEOUT_MS,
          );
        }),
      ]);
      if (returned) throw new Error('Order-ready event was not routed to WKMS');
    } finally {
      channel.off('return', onReturn);
      if (timeout) clearTimeout(timeout);
    }
  }

  private async disconnect(): Promise<void> {
    const { connection } = this;
    const { channel } = this;
    this.connection = null;
    this.channel = null;
    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.poller) clearInterval(this.poller);
    await this.disconnect();
  }
}
