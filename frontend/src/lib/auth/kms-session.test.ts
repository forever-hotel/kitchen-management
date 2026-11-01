import { parseKmsStaffSession } from './kms-session';

const NOW_SECONDS = 1900000000;

const validSession = {
  sub: 'worker-123',
  username: 'kitchen.staff',
  role: 'KITCHEN_STAFF',
  expiresAt: NOW_SECONDS + 3600,
  passwordChangeRequired: false,
};

describe('KMS staff session validation', () => {
  it('accepts a valid kitchen staff session', () => {
    expect(parseKmsStaffSession(validSession, NOW_SECONDS)).toEqual(validSession);
  });

  it('accepts a valid kitchen manager session', () => {
    const session = {
      ...validSession,
      role: 'KITCHEN_MANAGER',
    };

    expect(parseKmsStaffSession(session, NOW_SECONDS)).toEqual(session);
  });

  it('rejects roles outside KMS', () => {
    expect(parseKmsStaffSession({ ...validSession, role: 'RECEPTIONIST' }, NOW_SECONDS)).toBeNull();
  });

  it('rejects expired sessions', () => {
    expect(
      parseKmsStaffSession({ ...validSession, expiresAt: NOW_SECONDS }, NOW_SECONDS),
    ).toBeNull();
  });

  it('rejects malformed session data', () => {
    expect(parseKmsStaffSession(null, NOW_SECONDS)).toBeNull();

    expect(parseKmsStaffSession({ ...validSession, sub: '' }, NOW_SECONDS)).toBeNull();

    expect(
      parseKmsStaffSession({ ...validSession, passwordChangeRequired: 'false' }, NOW_SECONDS),
    ).toBeNull();
  });

  it('preserves the password change requirement', () => {
    const session = {
      ...validSession,
      passwordChangeRequired: true,
    };

    expect(parseKmsStaffSession(session, NOW_SECONDS)?.passwordChangeRequired).toBe(true);
  });

  it('does not expose access tokens in session data', () => {
    const session = parseKmsStaffSession(
      {
        ...validSession,
        accessToken: 'server-only-token',
      },
      NOW_SECONDS,
    );

    expect(session).not.toHaveProperty('accessToken');
    expect(session?.role).toBe('KITCHEN_STAFF');
  });
});
