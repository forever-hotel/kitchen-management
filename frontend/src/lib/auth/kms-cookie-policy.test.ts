import {
  getKmsSessionCookieOptions,
  KMS_SESSION_COOKIE_NAME,
  MAX_KMS_SESSION_SECONDS,
} from './kms-cookie-policy';

const NOW = 1900000000;

describe('KMS session cookie policy', () => {
  it('uses a dedicated KMS BFF cookie name', () => {
    expect(KMS_SESSION_COOKIE_NAME).toBe('kms_bff_session');
  });

  it('applies secure browser session settings', () => {
    expect(getKmsSessionCookieOptions(NOW + 3600, NOW, true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 3600,
    });
  });

  it('supports local HTTP development', () => {
    const options = getKmsSessionCookieOptions(NOW + 3600, NOW, false);

    expect(options.secure).toBe(false);
    expect(options.httpOnly).toBe(true);
  });

  it('limits cookie lifetime to eight hours', () => {
    const options = getKmsSessionCookieOptions(NOW + 86400, NOW, true);

    expect(options.maxAge).toBe(MAX_KMS_SESSION_SECONDS);
  });

  it('uses shorter Gateway expiration times', () => {
    const options = getKmsSessionCookieOptions(NOW + 600, NOW, true);

    expect(options.maxAge).toBe(600);
  });

  it('rejects expired sessions', () => {
    expect(() => getKmsSessionCookieOptions(NOW, NOW)).toThrow('Invalid or expired KMS session');

    expect(() => getKmsSessionCookieOptions(NOW - 1, NOW)).toThrow(
      'Invalid or expired KMS session',
    );
  });

  it('rejects malformed expiration times', () => {
    expect(() => getKmsSessionCookieOptions(NaN, NOW)).toThrow();

    expect(() => getKmsSessionCookieOptions(Number.POSITIVE_INFINITY, NOW)).toThrow();

    expect(() => getKmsSessionCookieOptions(NOW + 0.5, NOW)).toThrow();
  });
});
