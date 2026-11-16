import { isKmsRole, type KmsStaffSession } from '@/types/gateway-auth';

/**
 * Validates a staff session returned by the shared
 * Forever Hotel API Gateway.
 *
 * Only KMS-approved roles are accepted.
 * Expired or malformed sessions are rejected.
 *
 * This is response validation, not a replacement
 * for server-side Gateway authentication.
 */
export function parseKmsStaffSession(
  value: unknown,
  nowSeconds = Math.floor(Date.now() / 1000),
): KmsStaffSession | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const session = value as Record<string, unknown>;

  if (
    typeof session.sub !== 'string' ||
    !session.sub.trim() ||
    typeof session.username !== 'string' ||
    !session.username.trim() ||
    !isKmsRole(session.role) ||
    typeof session.expiresAt !== 'number' ||
    !Number.isSafeInteger(session.expiresAt) ||
    session.expiresAt <= nowSeconds ||
    typeof session.passwordChangeRequired !== 'boolean'
  ) {
    return null;
  }

  return {
    sub: session.sub,
    username: session.username,
    role: session.role,
    expiresAt: session.expiresAt,
    passwordChangeRequired: session.passwordChangeRequired,
  };
}
