import { environmentValidationSchema } from './environment.validation.js';

describe('environmentValidationSchema', () => {
  it('TC-ENV-001 Given no overrides when validated then development defaults are used', () => {
    const { error, value } = environmentValidationSchema.validate({});

    expect(error).toBeUndefined();
    expect(value.NODE_ENV).toBe('development');
    expect(value.PORT).toBe(3001);
  });

  it('TC-ENV-002 Given an invalid port when validated then validation fails', () => {
    const { error } = environmentValidationSchema.validate({
      PORT: 'invalid-port',
    });

    expect(error).toBeDefined();
  });

  it('TC-ENV-003 Given an unsupported environment when validated then validation fails', () => {
    const { error } = environmentValidationSchema.validate({
      NODE_ENV: 'invalid-environment',
    });

    expect(error).toBeDefined();
  });
});
