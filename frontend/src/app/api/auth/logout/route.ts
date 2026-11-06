import { ApiError } from '../../../../lib/api/api-error';
import { logoutKmsStaff } from '../../../../lib/auth/kms-gateway-auth';
import { clearKmsSessionCookie, getKmsSessionToken } from '../../../../lib/auth/kms-session-store';

export const runtime = 'nodejs';

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie',
    },
  });
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');

  if (!origin || origin !== new URL(request.url).origin) {
    return false;
  }

  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return false;
  }

  return true;
}

function signedOutResponse(): Response {
  return jsonResponse({
    status: 'signed_out',
  });
}

/**
 * Revoke the Gateway JWT and remove the KMS browser session.
 *
 * If Gateway revocation fails because of a temporary
 * service error, retain the cookie and allow a retry.
 *
 * Invalid or already-revoked tokens can be cleared
 * locally without requiring further Gateway access.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ error: 'Forbidden request origin' }, 403);
  }

  try {
    const storedSession = await getKmsSessionToken();

    if (!storedSession) {
      await clearKmsSessionCookie();
      return signedOutResponse();
    }

    try {
      await logoutKmsStaff(storedSession.accessToken);
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'unauthenticated') {
        // Gateway already rejects this token.
        await clearKmsSessionCookie();
        return signedOutResponse();
      }

      throw error;
    }

    // Only clear after confirmed revocation.
    await clearKmsSessionCookie();

    return signedOutResponse();
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.kind === 'timeout') {
        return jsonResponse({ error: 'Logout service timed out. Please retry.' }, 504);
      }

      if (error.kind === 'forbidden') {
        return jsonResponse({ error: 'Session revocation was denied' }, 403);
      }
    }

    return jsonResponse({ error: 'Unable to complete logout. Please retry.' }, 503);
  }
}
