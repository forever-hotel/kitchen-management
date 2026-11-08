import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface KmsSessionToken {
  accessToken: string;
  expiresAt: number;
}

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const AAD = Buffer.from('kms-bff-session-v1');
const MAX_COOKIE_LENGTH = 8192;

function getEncryptionKey(): Buffer {
  const raw = process.env.KMS_SESSION_ENCRYPTION_KEY?.trim();

  if (!raw || !/^[A-Za-z0-9+/]{43}=$/.test(raw)) {
    throw new Error('KMS_SESSION_ENCRYPTION_KEY must be a 32-byte base64 key');
  }

  const key = Buffer.from(raw, 'base64');

  if (key.length !== 32 || key.toString('base64') !== raw) {
    throw new Error('Invalid KMS session encryption key');
  }

  return key;
}

/**
 * Encrypt a Gateway access token on the Next.js server.
 * Never call this function from a browser component.
 */
export function sealKmsSessionToken(
  accessToken: string,
  expiresAt: number,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  if (
    typeof accessToken !== 'string' ||
    !accessToken.trim() ||
    !Number.isSafeInteger(expiresAt) ||
    !Number.isSafeInteger(nowSeconds) ||
    expiresAt <= nowSeconds
  ) {
    throw new Error('Invalid KMS session token');
  }

  const key = getEncryptionKey();
  const iv = randomBytes(12);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(AAD);

  const payload = JSON.stringify({
    accessToken,
    expiresAt,
  });

  const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);

  return [
    VERSION,
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join('.');
}

/**
 * Decrypt and validate the stored cookie payload.
 *
 * Returns null for malformed, modified or expired data.
 * Invalid server encryption configuration throws.
 */
export function unsealKmsSessionToken(
  cookieValue: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): KmsSessionToken | null {
  const key = getEncryptionKey();

  if (
    typeof cookieValue !== 'string' ||
    cookieValue.length > MAX_COOKIE_LENGTH ||
    !Number.isSafeInteger(nowSeconds)
  ) {
    return null;
  }

  const parts = cookieValue.split('.');

  if (
    parts.length !== 4 ||
    parts[0] !== VERSION ||
    parts.slice(1).some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
  ) {
    return null;
  }

  try {
    const iv = Buffer.from(parts[1], 'base64url');
    const encrypted = Buffer.from(parts[2], 'base64url');
    const tag = Buffer.from(parts[3], 'base64url');

    if (iv.length !== 12 || tag.length !== 16) {
      return null;
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAAD(AAD);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      'utf8',
    );

    const payload: unknown = JSON.parse(decrypted);

    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }

    const session = payload as Record<string, unknown>;

    if (
      typeof session.accessToken !== 'string' ||
      !session.accessToken.trim() ||
      typeof session.expiresAt !== 'number' ||
      !Number.isSafeInteger(session.expiresAt) ||
      session.expiresAt <= nowSeconds
    ) {
      return null;
    }

    return {
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
    };
  } catch {
    return null;
  }
}
