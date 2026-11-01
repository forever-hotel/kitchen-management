import { ApiError } from '../../../../lib/api/api-error';
import { validateKmsGatewaySession } from '../../../../lib/auth/kms-gateway-auth';
import { getKmsSessionToken } from '../../../../lib/auth/kms-session-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

/**
 * Verify the currently authenticated kitchen employee.
 *
 * An encrypted cookie alone is not proof of an active
 * session. The Gateway must validate the token.
 */
export async function GET(): Promise<Response> {
  try {
    const storedSession = await getKmsSessionToken();

    if (!storedSession) {
      return jsonResponse({ error: 'Authentication required' }, 401);
    }

    const session = await validateKmsGatewaySession(storedSession.accessToken);

    // Return only safe staff details.
    // Never return the stored Gateway access token.
    return jsonResponse({
      authenticated: true,
      session,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      switch (error.kind) {
        case 'unauthenticated':
          return jsonResponse({ error: 'Session expired or invalid' }, 401);

        case 'forbidden':
          return jsonResponse({ error: 'Access denied' }, 403);

        case 'timeout':
          return jsonResponse({ error: 'Authentication service timed out' }, 504);

        case 'invalid-response':
          return jsonResponse(
            { error: 'Authentication service returned an invalid response' },
            502,
          );

        default:
          return jsonResponse({ error: 'Authentication service unavailable' }, 503);
      }
    }

    return jsonResponse({ error: 'Unable to validate the session' }, 503);
  }
}
