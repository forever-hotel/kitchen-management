/** @jest-environment node */
jest.mock('../../../../lib/auth/kms-session-store', () => ({ getKmsSessionToken: jest.fn() }));
jest.mock('../../../../lib/auth/kms-gateway-auth', () => ({
  validateKmsGatewaySession: jest.fn(),
}));
import { getKmsSessionToken } from '../../../../lib/auth/kms-session-store';
import { validateKmsGatewaySession } from '../../../../lib/auth/kms-gateway-auth';
import { POST } from './route';

describe('KMS socket ticket relay', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  const request = (origin = 'http://localhost:3005') =>
    new Request('http://localhost:3005/api/realtime/ticket', {
      method: 'POST',
      headers: { origin },
    });
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.APP_ORIGIN = 'http://localhost:3005';
    process.env.KMS_WEBSOCKET_RELAY_KEY = 'private-relay';
    process.env.SHARED_WEBSOCKET_URL = 'http://websocket:8081';
    process.env.KMS_SOCKET_PUBLIC_URL = 'http://localhost:8080';
    jest
      .mocked(getKmsSessionToken)
      .mockResolvedValue({ accessToken: 'private-jwt', expiresAt: 9999999999 });
    jest.mocked(validateKmsGatewaySession).mockResolvedValue({
      sub: 'staff',
      username: 'chef',
      role: 'KITCHEN_STAFF',
      expiresAt: 9999999999,
      passwordChangeRequired: false,
    });
    global.fetch = jest.fn().mockResolvedValue(Response.json({ ticket: 't'.repeat(43) }));
  });
  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });
  it('returns a one-use ticket and public gateway address without exposing the staff JWT or relay key', async () => {
    const response = await POST(request());
    expect(await response.json()).toEqual({
      ticket: 't'.repeat(43),
      socketUrl: 'http://localhost:8080',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://websocket:8081/internal/tickets/kms',
      expect.objectContaining({
        headers: { authorization: 'Bearer private-jwt', 'x-relay-key': 'private-relay' },
      }),
    );
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('rejects cross-origin requests and missing sessions before issuing tickets', async () => {
    expect((await POST(request('https://evil.example'))).status).toBe(403);
    jest.mocked(getKmsSessionToken).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  it('blocks first-login sessions and fails closed on transport failure', async () => {
    jest.mocked(validateKmsGatewaySession).mockResolvedValueOnce({
      sub: 'staff',
      username: 'chef',
      role: 'ROOT',
      expiresAt: 9999999999,
      passwordChangeRequired: true,
    });
    expect((await POST(request())).status).toBe(403);
    jest.mocked(global.fetch).mockRejectedValueOnce(new Error('private internal error'));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private internal error');
  });
});
