import { cookies } from 'next/headers';

import { getKmsSessionCookieOptions, KMS_SESSION_COOKIE_NAME } from './kms-cookie-policy';

import {
  sealKmsSessionToken,
  unsealKmsSessionToken,
  type KmsSessionToken,
} from './kms-session-crypto';

/**
 * Store an encrypted Gateway access token.
 *
 * Call only from a server action or route handler.
 */
export async function setKmsSessionCookie(accessToken: string, expiresAt: number): Promise<void> {
  const encryptedValue = sealKmsSessionToken(accessToken, expiresAt);

  const options = getKmsSessionCookieOptions(expiresAt);

  const cookieStore = await cookies();

  cookieStore.set(KMS_SESSION_COOKIE_NAME, encryptedValue, options);
}

/**
 * Read and decrypt the browser session on the server.
 *
 * The returned token must never be sent to client
 * components or included in page responses.
 *
 * A valid encrypted cookie does not by itself prove
 * the Gateway session is still active.
 */
export async function getKmsSessionToken(): Promise<KmsSessionToken | null> {
  const cookieStore = await cookies();

  const encryptedValue = cookieStore.get(KMS_SESSION_COOKIE_NAME)?.value;

  if (!encryptedValue) {
    return null;
  }

  return unsealKmsSessionToken(encryptedValue);
}

/**
 * Remove the browser session cookie.
 *
 * Call only from a server action or route handler.
 * Gateway token revocation is handled separately.
 */
export async function clearKmsSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(KMS_SESSION_COOKIE_NAME);
}
