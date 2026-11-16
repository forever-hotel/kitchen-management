import { sealKmsSessionToken, unsealKmsSessionToken } from './kms-session-crypto';

const NOW = 1900000000;
const TOKEN = 'example-gateway-jwt-token';

describe('KMS encrypted session token', () => {
  const originalKey = process.env.KMS_SESSION_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.KMS_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.KMS_SESSION_ENCRYPTION_KEY;
    } else {
      process.env.KMS_SESSION_ENCRYPTION_KEY = originalKey;
    }
  });

  it('encrypts and decrypts a valid token', () => {
    const sealed = sealKmsSessionToken(TOKEN, NOW + 3600, NOW);

    expect(sealed).not.toContain(TOKEN);

    expect(unsealKmsSessionToken(sealed, NOW)).toEqual({
      accessToken: TOKEN,
      expiresAt: NOW + 3600,
    });
  });

  it('generates different ciphertext for each session', () => {
    const first = sealKmsSessionToken(TOKEN, NOW + 3600, NOW);

    const second = sealKmsSessionToken(TOKEN, NOW + 3600, NOW);

    expect(first).not.toBe(second);
  });

  it('rejects modified encrypted data', () => {
    const sealed = sealKmsSessionToken(TOKEN, NOW + 3600, NOW);

    const parts = sealed.split('.');
    parts[2] = Buffer.from('tampered').toString('base64url');

    expect(unsealKmsSessionToken(parts.join('.'), NOW)).toBeNull();
  });

  it('rejects expired tokens', () => {
    const sealed = sealKmsSessionToken(TOKEN, NOW + 60, NOW);

    expect(unsealKmsSessionToken(sealed, NOW + 60)).toBeNull();
  });

  it('rejects invalid cookie values', () => {
    expect(unsealKmsSessionToken('invalid-cookie', NOW)).toBeNull();

    expect(unsealKmsSessionToken('', NOW)).toBeNull();
  });

  it('refuses to encrypt expired sessions', () => {
    expect(() => sealKmsSessionToken(TOKEN, NOW, NOW)).toThrow('Invalid KMS session token');
  });

  it('requires a server-side encryption key', () => {
    delete process.env.KMS_SESSION_ENCRYPTION_KEY;

    expect(() => sealKmsSessionToken(TOKEN, NOW + 3600, NOW)).toThrow('KMS_SESSION_ENCRYPTION_KEY');
  });

  it('rejects incorrectly sized encryption keys', () => {
    process.env.KMS_SESSION_ENCRYPTION_KEY = Buffer.alloc(16, 7).toString('base64');

    expect(() => sealKmsSessionToken(TOKEN, NOW + 3600, NOW)).toThrow('KMS_SESSION_ENCRYPTION_KEY');
  });
});
