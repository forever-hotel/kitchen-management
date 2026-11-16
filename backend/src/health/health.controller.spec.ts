import { ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { DatabaseHealthService } from '../database/database-health.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;
  let databaseHealthService: jest.Mocked<
    Pick<DatabaseHealthService, 'isReady'>
  >;

  beforeEach(() => {
    databaseHealthService = {
      isReady: jest.fn(),
    };

    controller = new HealthController(
      databaseHealthService as unknown as DatabaseHealthService,
    );
  });

  describe('getLiveness', () => {
    it('TC-KMS-HEALTH-001: Given the application is running, when liveness is checked, then it returns ok without checking PostgreSQL', () => {
      // Arrange

      // Act
      const result = controller.getLiveness();

      // Assert
      expect(result).toEqual({
        status: 'ok',
        service: 'kms-backend',
      });
      expect(databaseHealthService.isReady).not.toHaveBeenCalled();
    });
  });

  describe('getReadiness', () => {
    it('TC-KMS-HEALTH-002: Given PostgreSQL is ready, when readiness is checked, then it returns ok', async () => {
      // Arrange
      databaseHealthService.isReady.mockResolvedValue(true);

      // Act
      const result = await controller.getReadiness();

      // Assert
      expect(result).toEqual({
        status: 'ok',
        service: 'kms-backend',
        dependencies: {
          database: 'up',
        },
      });
    });

    it('TC-KMS-HEALTH-003: Given PostgreSQL is unavailable, when readiness is checked, then HTTP service-unavailable semantics are returned', async () => {
      // Arrange
      databaseHealthService.isReady.mockResolvedValue(false);

      // Act / Assert
      await expect(controller.getReadiness()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
