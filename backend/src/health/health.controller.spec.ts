import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  describe('getLiveness', () => {
    it('TC-KMS-HEALTH-001: Given the application is running, when liveness is checked, then it returns ok', () => {
      // Arrange

      // Act
      const result = controller.getLiveness();

      // Assert
      expect(result).toEqual({
        status: 'ok',
        service: 'kms-backend',
      });
    });
  });

  describe('getReadiness', () => {
    it('TC-KMS-HEALTH-002: Given startup is complete, when readiness is checked, then it returns ok', () => {
      // Arrange

      // Act
      const result = controller.getReadiness();

      // Assert
      expect(result).toEqual({
        status: 'ok',
        service: 'kms-backend',
      });
    });
  });
});
