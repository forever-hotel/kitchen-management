/** @jest-environment node */

jest.mock('../../../../lib/auth/kms-gateway-auth', () => ({
  logoutKmsStaff: jest.fn(),
}));

jest.mock('../../../../lib/auth/kms-session-store', () => ({
  getKmsSessionToken: jest.fn(),
  clearKmsSessionCookie: jest.fn(),
}));

import { ApiError } from '../../../../lib/api/api-error';
import { logoutKmsStaff } from '../../../../lib/auth/kms-gateway-auth';
import { clearKmsSessionCookie, getKmsSessionToken } from '../../../../lib/auth/kms-session-store';

import { POST } from './route';

const mockedLogout = jest.mocked(logoutKmsStaff);
const mockedGetToken = jest.mocked(getKmsSessionToken);
const mockedClearCookie = jest.mocked(clearKmsSessionCookie);

const TOKEN = 'secret-gateway-access-token';

function logoutRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:3000',
      ...headers,
    },
  });
}

describe('KMS secure logout API route', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetToken.mockResolvedValue({
      accessToken: TOKEN,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });

    mockedLogout.mockResolvedValue(undefined);
    mockedClearCookie.mockResolvedValue(undefined);
  });

  it('revokes the Gateway token and clears the cookie', async () => {
    const response = await POST(logoutRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('signed_out');

    expect(mockedLogout).toHaveBeenCalledWith(TOKEN);
    expect(mockedClearCookie).toHaveBeenCalledTimes(1);

    expect(mockedLogout.mock.invocationCallOrder[0]).toBeLessThan(
      mockedClearCookie.mock.invocationCallOrder[0],
    );

    expect(JSON.stringify(body)).not.toContain(TOKEN);
  });

  it('handles logout without an active session', async () => {
    mockedGetToken.mockResolvedValueOnce(null);

    const response = await POST(logoutRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('signed_out');

    expect(mockedLogout).not.toHaveBeenCalled();
    expect(mockedClearCookie).toHaveBeenCalledTimes(1);
  });

  it('rejects requests without an Origin header', async () => {
    const request = logoutRequest();
    request.headers.delete('origin');

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mockedLogout).not.toHaveBeenCalled();
    expect(mockedClearCookie).not.toHaveBeenCalled();
  });

  it('rejects cross-origin logout requests', async () => {
    const response = await POST(
      logoutRequest({
        Origin: 'https://untrusted.example',
      }),
    );

    expect(response.status).toBe(403);
    expect(mockedLogout).not.toHaveBeenCalled();
  });

  it('rejects cross-site fetch metadata', async () => {
    const response = await POST(
      logoutRequest({
        'Sec-Fetch-Site': 'cross-site',
      }),
    );

    expect(response.status).toBe(403);
    expect(mockedLogout).not.toHaveBeenCalled();
  });

  it('clears sessions already rejected by Gateway', async () => {
    mockedLogout.mockRejectedValueOnce(new ApiError('Token revoked', 'unauthenticated', 401));

    const response = await POST(logoutRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('signed_out');
    expect(mockedClearCookie).toHaveBeenCalledTimes(1);
  });

  it('preserves the cookie when Gateway is unreachable', async () => {
    mockedLogout.mockRejectedValueOnce(new ApiError('Connection failed', 'network'));

    const response = await POST(logoutRequest());

    expect(response.status).toBe(503);
    expect(mockedClearCookie).not.toHaveBeenCalled();
  });

  it('handles Gateway timeouts without clearing the cookie', async () => {
    mockedLogout.mockRejectedValueOnce(new ApiError('Timeout', 'timeout'));

    const response = await POST(logoutRequest());

    expect(response.status).toBe(504);
    expect(mockedClearCookie).not.toHaveBeenCalled();
  });

  it('handles forbidden Gateway responses', async () => {
    mockedLogout.mockRejectedValueOnce(new ApiError('Forbidden', 'forbidden', 403));

    const response = await POST(logoutRequest());

    expect(response.status).toBe(403);
    expect(mockedClearCookie).not.toHaveBeenCalled();
  });

  it('handles unexpected errors without exposing secrets', async () => {
    mockedLogout.mockRejectedValueOnce(new Error('Sensitive server error'));

    const response = await POST(logoutRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(mockedClearCookie).not.toHaveBeenCalled();

    expect(JSON.stringify(body)).not.toContain('Sensitive server error');
  });

  it('handles cookie deletion failures', async () => {
    mockedClearCookie.mockRejectedValueOnce(new Error('Cookie deletion failed'));

    const response = await POST(logoutRequest());

    expect(response.status).toBe(503);
    expect(mockedLogout).toHaveBeenCalledWith(TOKEN);
  });

  it('disables caching of logout responses', async () => {
    const response = await POST(logoutRequest());

    expect(response.headers.get('cache-control')).toBe('private, no-store');

    expect(response.headers.get('vary')).toBe('Cookie');
  });
});
