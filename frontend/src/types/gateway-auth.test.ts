import { isKmsRole, KMS_ROLES } from './gateway-auth';

describe('KMS Gateway authentication contracts', () => {
  it('accepts the two authorized KMS roles', () => {
    expect(KMS_ROLES).toEqual(['KITCHEN_MANAGER', 'KITCHEN_STAFF']);

    expect(isKmsRole('KITCHEN_MANAGER')).toBe(true);
    expect(isKmsRole('KITCHEN_STAFF')).toBe(true);
  });

  it('rejects roles belonging to other subsystems', () => {
    expect(isKmsRole('MANAGER')).toBe(false);
    expect(isKmsRole('RECEPTIONIST')).toBe(false);
    expect(isKmsRole('WORKER')).toBe(false);
  });

  it('rejects invalid or missing roles', () => {
    expect(isKmsRole(null)).toBe(false);
    expect(isKmsRole(undefined)).toBe(false);
    expect(isKmsRole('')).toBe(false);
    expect(isKmsRole(123)).toBe(false);
  });
});
