import { jest } from '@jest/globals';
import { DataSource } from 'typeorm';

import { DatabaseHealthService } from './database-health.service.js';

describe('DatabaseHealthService', () => {
  it('TC-KMS-DB-005: Given the database connection is initialized and responsive, when readiness is checked, then it returns true', async () => {
    // Arrange
    const dataSource = {
      isInitialized: true,
      query: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue([{ result: 1 }]),
    } as unknown as DataSource;

    const service = new DatabaseHealthService(dataSource);

    // Act
    const result = await service.isReady();

    // Assert
    expect(result).toBe(true);
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('TC-KMS-DB-006: Given the database connection is not initialized, when readiness is checked, then it returns false', async () => {
    // Arrange
    const dataSource = {
      isInitialized: false,
      query: jest.fn<() => Promise<unknown>>(),
    } as unknown as DataSource;

    const service = new DatabaseHealthService(dataSource);

    // Act
    const result = await service.isReady();

    // Assert
    expect(result).toBe(false);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('TC-KMS-DB-007: Given the database query fails, when readiness is checked, then it returns false without exposing the error', async () => {
    // Arrange
    const dataSource = {
      isInitialized: true,
      query: jest
        .fn<() => Promise<unknown>>()
        .mockRejectedValue(new Error('database unavailable')),
    } as unknown as DataSource;

    const service = new DatabaseHealthService(dataSource);

    // Act
    const result = await service.isReady();

    // Assert
    expect(result).toBe(false);
  });
});
