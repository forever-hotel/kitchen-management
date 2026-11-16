import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional() private readonly config?: ConfigService,
  ) {}

  async isReady(): Promise<boolean> {
    if (!this.dataSource.isInitialized) {
      return false;
    }

    try {
      await this.dataSource.query('SELECT 1');
      if (this.config?.get<string>('KMS_REALTIME_ENABLED') === 'true') {
        await this.dataSource.query(
          'SELECT event_id, published_at, next_attempt_at FROM kms_integration_outbox LIMIT 0',
        );
        await this.dataSource.query(
          'SELECT ordering_enabled FROM kms_meal_categories LIMIT 0',
        );
        await this.dataSource.query(
          'SELECT acknowledgement_id FROM kms_order_allergy_acknowledgements LIMIT 0',
        );
        await this.dataSource.query(
          'SELECT food_order_id FROM kms_order_ready_outbox LIMIT 0',
        );
      }
      return true;
    } catch {
      return false;
    }
  }
}
