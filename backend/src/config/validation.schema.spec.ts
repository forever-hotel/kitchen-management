import { environmentValidationSchema } from './validation.schema.js';

const validDatabaseEnvironment = {
  DATABASE_URL:
    'postgresql://forever:local-password@localhost:5432/forever_hotel',
};

describe('environmentValidationSchema', () => {
  it('TC-ENV-001 Given required database configuration when validated then development defaults are used', () => {
    // Arrange / Act
    const { error, value } = environmentValidationSchema.validate(
      validDatabaseEnvironment,
    );

    // Assert
    expect(error).toBeUndefined();
    expect(value.NODE_ENV).toBe('development');
    expect(value.PORT).toBe(3001);
    expect(value.DATABASE_SSL).toBe(false);
  });

  it('TC-ENV-002 Given an invalid port when validated then validation fails', () => {
    // Arrange / Act
    const { error } = environmentValidationSchema.validate({
      ...validDatabaseEnvironment,
      PORT: 'invalid-port',
    });

    // Assert
    expect(error).toBeDefined();
  });

  it('TC-ENV-003 Given an unsupported environment when validated then validation fails', () => {
    // Arrange / Act
    const { error } = environmentValidationSchema.validate({
      ...validDatabaseEnvironment,
      NODE_ENV: 'invalid-environment',
    });

    // Assert
    expect(error).toBeDefined();
  });

  it('TC-KMS-DB-003 Given DATABASE_URL is missing when validated then validation fails', () => {
    // Arrange / Act
    const { error } = environmentValidationSchema.validate({
      NODE_ENV: 'development',
    });

    // Assert
    expect(error).toBeDefined();
    expect(error?.message).toContain('DATABASE_URL');
  });

  it('TC-KMS-DB-004 Given DATABASE_URL uses an unsupported scheme when validated then validation fails', () => {
    // Arrange / Act
    const { error } = environmentValidationSchema.validate({
      DATABASE_URL: 'mysql://user:password@localhost/database',
    });

    // Assert
    expect(error).toBeDefined();
  });
});
