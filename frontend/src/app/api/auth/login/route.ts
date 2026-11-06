import { ApiError } from '../../../../lib/api/api-error';
import { loginKmsStaff } from '../../../../lib/auth/kms-gateway-auth';
import { setKmsSessionCookie } from '../../../../lib/auth/kms-session-store';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4096;

class RequestTooLargeError extends Error {}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
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
  const contentLength = request.headers.get('content-length');

  if (
    contentLength !== null &&
    (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)
  ) {
    throw new RequestTooLargeError();
  }

  if (!request.body) {
    throw new SyntaxError('Missing request body');
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      totalBytes += value.byteLength;

      if (totalBytes > MAX_BODY_BYTES) {
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

function parseCredentials(value: unknown): { username: string; password: string } | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const body = value as Record<string, unknown>;

  if (typeof body.username !== 'string' || typeof body.password !== 'string') {
    return null;
  }

  const username = body.username.trim();

  if (!username || username.length > 100 || !body.password || body.password.length > 1024) {
    return null;
  }

  return {
    username,
    password: body.password,
  };
}

function gatewayErrorResponse(error: ApiError): Response {
  switch (error.kind) {
    case 'validation':
      return jsonResponse({ error: 'Invalid login request' }, 400);

    case 'unauthenticated':
      return jsonResponse({ error: 'Invalid username or password' }, 401);

    case 'forbidden':
      return jsonResponse({ error: 'Access to Kitchen Management is denied' }, 403);

    case 'rate-limited':
      return jsonResponse({ error: 'Too many requests. Try again later.' }, 429);

    case 'timeout':
      return jsonResponse({ error: 'Authentication service timed out' }, 504);

    case 'invalid-response':
      return jsonResponse({ error: 'Authentication service returned an invalid response' }, 502);

    default:
      return jsonResponse({ error: 'Authentication service unavailable' }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  // Reject cross-origin requests before reading credentials.
  if (!isSameOriginRequest(request)) {
    return jsonResponse({ error: 'Forbidden request origin' }, 403);
  }

  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();

  if (contentType !== 'application/json') {
    return jsonResponse({ error: 'JSON content type required' }, 415);
  }

  let body: unknown;

  try {
    body = await readLimitedJson(request);
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return jsonResponse({ error: 'Login request is too large' }, 413);
    }

    return jsonResponse({ error: 'Invalid JSON request' }, 400);
  }

  const credentials = parseCredentials(body);

  if (!credentials) {
    return jsonResponse({ error: 'Valid username and password are required' }, 400);
  }

  try {
    const result = await loginKmsStaff(credentials.username, credentials.password);

    // The Gateway JWT remains on the Next.js server.
    // Only encrypted session data is stored in the cookie.
    await setKmsSessionCookie(result.accessToken, result.session.expiresAt);

    return jsonResponse({
      session: result.session,
      nextPath: result.session.passwordChangeRequired ? '/change-password' : '/order-queue',
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return gatewayErrorResponse(error);
    }

    // Never expose internal errors or token values.
    return jsonResponse({ error: 'Unable to establish a secure login session' }, 503);
  }
}
