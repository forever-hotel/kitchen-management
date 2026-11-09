import { getKmsSessionToken } from '@/lib/auth/kms-session-store';
import { validateKmsGatewaySession } from '@/lib/auth/kms-gateway-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  const headers = { 'Cache-Control': 'private, no-store' };
  const origin = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (request.headers.get('origin') !== origin)
    return Response.json({ error: 'Forbidden' }, { status: 403, headers });
  try {
    const stored = await getKmsSessionToken();
    if (!stored) return Response.json({ error: 'Sign in required' }, { status: 401, headers });
    const session = await validateKmsGatewaySession(stored.accessToken);
    if (session.passwordChangeRequired)
      return Response.json({ error: 'Change password first' }, { status: 403, headers });
    const relay = process.env.KMS_WEBSOCKET_RELAY_KEY;
    const server = process.env.SHARED_WEBSOCKET_URL;
    if (!relay || !server) throw new Error('Realtime unavailable');
    const response = await fetch(`${server.replace(/\/$/, '')}/internal/tickets/kms`, {
      method: 'POST',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
      headers: { authorization: `Bearer ${stored.accessToken}`, 'x-relay-key': relay },
    });
    if (!response.ok) throw new Error('Realtime unavailable');
    const body = (await response.json()) as { ticket?: unknown };
    if (typeof body.ticket !== 'string' || !/^[\w-]{43}$/.test(body.ticket))
      throw new Error('Invalid ticket');
    return Response.json(
      { ticket: body.ticket, socketUrl: process.env.KMS_SOCKET_PUBLIC_URL || origin },
      { headers },
    );
  } catch {
    return Response.json({ error: 'Realtime temporarily unavailable' }, { status: 503, headers });
  }
}
