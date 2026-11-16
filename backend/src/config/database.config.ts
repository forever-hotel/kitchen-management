import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

/*
 * Creates the TypeORM configuration used by the KMS backend.
 *
 * Database credentials are supplied only through runtime configuration.
 * Schema synchronization stays disabled because the canonical project schema
 * and migrations are coordinated outside the KMS repository.
 */
export const createDatabaseOptions = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const sslEnabled = configService.get<boolean>('DATABASE_SSL', false);

  return {
    type: 'postgres',
    url: configService.getOrThrow<string>('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: false,
    ssl: sslEnabled
      ? {
          rejectUnauthorized: true,
        }
      : false,
  };
};
