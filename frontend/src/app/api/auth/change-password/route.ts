import { ApiError } from '../../../../lib/api/api-error';
import {
  changeKmsStaffPassword,
  validateKmsGatewaySession,
} from '../../../../lib/auth/kms-gateway-auth';
import {
  clearKmsSessionCookie,
  getKmsSessionToken,
  setKmsSessionCookie,
} from '../../../../lib/auth/kms-session-store';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4096;

class RequestTooLargeError extends Error {}

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

async function readLimitedJson(request: Request): Promise<unknown> {
  const length = request.headers.get('content-length');

  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    throw new RequestTooLargeError();
  }

  if (!request.body) {
    throw new SyntaxError('Missing request body');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      total += value.byteLength;

      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RequestTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const text = new TextDecoder('utf-8', {
    fatal: true,
  }).decode(Buffer.concat(chunks));

  return JSON.parse(text) as unknown;
}

function parsePasswords(value: unknown): {
  currentPassword: string;
  newPassword: string;
} | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const body = value as Record<string, unknown>;

  if (typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
    return null;
  }

  if (
    !body.currentPassword ||
    body.currentPassword.length > 1024 ||
    body.newPassword.length < 12 ||
    body.newPassword.length > 1024 ||
    body.currentPassword === body.newPassword
  ) {
    return null;
  }

  return {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  };
}

function gatewayErrorResponse(error: ApiError): Response {
  switch (error.kind) {
    case 'validation':
      return jsonResponse(
        {
          error: 'Password change request was rejected',
        },
        400,
      );

    case 'unauthenticated':
      return jsonResponse(
        {
          error: 'Authentication failed. Check your current password or sign in again.',
        },
        401,
      );

    case 'forbidden':
      return jsonResponse(
        {
          error: 'Password change is not permitted',
        },
        403,
      );

    case 'rate-limited':
      return jsonResponse(
        {
          error: 'Too many attempts. Try again later.',
        },
        429,
      );

    case 'timeout':
      return jsonResponse(
        {
          error: 'Authentication service timed out',
        },
        504,
      );

    case 'invalid-response':
      return jsonResponse(
        {
          error: 'Invalid authentication service response',
        },
        502,
      );

    default:
      return jsonResponse(
        {
          error: 'Authentication service unavailable',
        },
        503,
      );
  }
}

/**
 * Change a KMS staff password only when explicitly
 * required by the central API Gateway.
 *
 * Kitchen Staff and Kitchen Manager are permitted
 * to change their password during first-login setup
 * or after a manager-initiated password reset.
 *
 * Ordinary authenticated users cannot change
 * their password through this endpoint.
 *
 * The Gateway replacement JWT is encrypted into
 * the server-managed HttpOnly cookie and is never
 * included in the client-facing JSON response.
 */
export async function POST(request: Request): Promise<Response> {
  // Reject requests from other origins.
  if (!isSameOriginRequest(request)) {
    return jsonResponse(
      {
        error: 'Forbidden request origin',
      },
      403,
    );
  }

  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();

  if (contentType !== 'application/json') {
    return jsonResponse(
      {
        error: 'JSON content type required',
      },
      415,
    );
  }

  let body: unknown;

  try {
    body = await readLimitedJson(request);
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return jsonResponse(
        {
          error: 'Request is too large',
        },
        413,
      );
    }

    return jsonResponse(
      {
        error: 'Invalid JSON request',
      },
      400,
    );
  }

  const passwords = parsePasswords(body);

  if (!passwords) {
    return jsonResponse(
      {
        error:
          'Provide a valid current password and a different new password of at least 12 characters',
      },
      400,
    );
  }

  try {
    // STEP 1: Read the encrypted server-managed session.
    const storedSession = await getKmsSessionToken();

    if (!storedSession) {
      return jsonResponse(
        {
          error: 'Authentication required',
        },
        401,
      );
    }

    // STEP 2: Ask the Gateway to validate the active
    // session and determine whether a password change
    // is currently required.
    const currentSession = await validateKmsGatewaySession(storedSession.accessToken);

    // STEP 3: Enforce the first-login-only rule.
    //
    // This also permits a mandatory password change
    // following a manager-initiated password reset.
    if (!currentSession.passwordChangeRequired) {
      return jsonResponse(
        {
          error:
            'Password change is only available when required at first login or after a manager password reset.',
        },
        403,
      );
    }

    // STEP 4: Submit the password change to the Gateway.
    const result = await changeKmsStaffPassword(
      storedSession.accessToken,
      passwords.currentPassword,
      passwords.newPassword,
    );

    // The Gateway must confirm that the required
    // password-change condition has been cleared.
    if (result.session.passwordChangeRequired) {
      try {
        await clearKmsSessionCookie();
      } catch {
        // Avoid exposing cookie configuration details.
      }

      return jsonResponse(
        {
          error: 'Password change could not be confirmed. Please sign in again.',
        },
        502,
      );
    }

    // STEP 5: The Gateway invalidates the previous JWT.
    // Store the replacement token in the encrypted cookie.
    try {
      await setKmsSessionCookie(result.accessToken, result.session.expiresAt);
    } catch {
      // The password may already have changed.
      // Clear the stale local session and require login.
      try {
        await clearKmsSessionCookie();
      } catch {
        // Do not expose internal security information.
      }

      return jsonResponse(
        {
          error: 'Password changed, but the session could not be updated. Please sign in again.',
        },
        503,
      );
    }

    // STEP 6: Return safe session information only.
    return jsonResponse({
      status: 'password_changed',
      session: result.session,
      nextPath: '/order-queue',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return gatewayErrorResponse(error);
    }

    return jsonResponse(
      {
        error: 'Unable to change password',
      },
      503,
    );
  }
}
