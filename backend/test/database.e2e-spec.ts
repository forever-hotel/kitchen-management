import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';

describe('Database integration (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
  });

  it('TC-KMS-DB-E2E-001: Given PostgreSQL is available, when the application starts, then the TypeORM data source is initialized', () => {
    // Arrange / Act / Assert
    expect(dataSource.isInitialized).toBe(true);
  });

  it('TC-KMS-DB-E2E-002: Given PostgreSQL is available, when a connectivity query runs, then PostgreSQL responds successfully', async () => {
    // Arrange / Act
    const result = await dataSource.query('SELECT 1 AS result');

    // Assert
    expect(result).toEqual([
      {
        result: 1,
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });
});
