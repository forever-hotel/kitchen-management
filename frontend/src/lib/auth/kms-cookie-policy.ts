/**
 * Security policy for the KMS BFF session cookie.
 *
 * The browser must never receive the Gateway access
 * token in JavaScript-accessible storage.
 */

export const KMS_SESSION_COOKIE_NAME = 'kms_bff_session';

export const MAX_KMS_SESSION_SECONDS = 8 * 60 * 60;

export interface KmsCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  path: '/';
  maxAge: number;
}

export function getKmsSessionCookieOptions(
  expiresAtSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
  isProduction = process.env.NODE_ENV === 'production' &&
    !(
      process.env.KMS_ALLOW_INSECURE_LOCAL_COOKIE === 'true' &&
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(process.env.APP_ORIGIN || '')
    ),
): KmsCookieOptions {
  if (
    !Number.isSafeInteger(expiresAtSeconds) ||
    !Number.isSafeInteger(nowSeconds) ||
    expiresAtSeconds <= nowSeconds
  ) {
    throw new Error('Invalid or expired KMS session');
  }

  const remainingSeconds = expiresAtSeconds - nowSeconds;

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: Math.min(remainingSeconds, MAX_KMS_SESSION_SECONDS),
  };
}
