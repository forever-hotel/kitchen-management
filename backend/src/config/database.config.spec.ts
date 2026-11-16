import { ConfigService } from '@nestjs/config';

import { createDatabaseOptions } from './database.config.js';

describe('createDatabaseOptions', () => {
  it('TC-KMS-DB-001: Given local PostgreSQL configuration, when options are created, then synchronization and SSL are disabled', () => {
    // Arrange
    const configService = new ConfigService({
      DATABASE_URL:
        'postgresql://forever:local-password@localhost:5432/forever_hotel',
      DATABASE_SSL: false,
    });

    // Act
    const options = createDatabaseOptions(configService);

    // Assert
    expect(options).toMatchObject({
      type: 'postgres',
      url: 'postgresql://forever:local-password@localhost:5432/forever_hotel',
      autoLoadEntities: true,
      synchronize: false,
      ssl: false,
    });
  });

  it('TC-KMS-DB-002: Given managed PostgreSQL requires SSL, when options are created, then certificate validation remains enabled', () => {
    // Arrange
    const configService = new ConfigService({
      DATABASE_URL:
        'postgresql://user:password@example.neon.tech:5432/forever_hotel',
      DATABASE_SSL: true,
    });

    // Act
    const options = createDatabaseOptions(configService);

    // Assert
    expect(options).toMatchObject({
      ssl: {
        rejectUnauthorized: true,
      },
      synchronize: false,
    });
  });
});
