/** @jest-environment node */

jest.mock('../../../../lib/auth/kms-gateway-auth', () => ({
  loginKmsStaff: jest.fn(),
}));

jest.mock('../../../../lib/auth/kms-session-store', () => ({
  setKmsSessionCookie: jest.fn(),
}));

import { ApiError } from '../../../../lib/api/api-error';
import { loginKmsStaff } from '../../../../lib/auth/kms-gateway-auth';
import { setKmsSessionCookie } from '../../../../lib/auth/kms-session-store';

import { POST } from './route';

const mockedLogin = jest.mocked(loginKmsStaff);
const mockedSetCookie = jest.mocked(setKmsSessionCookie);

const expiresAt = Math.floor(Date.now() / 1000) + 3600;

const validSession = {
  sub: 'worker-123',
  username: 'chef.manager',
  role: 'KITCHEN_MANAGER' as const,
  expiresAt,
  passwordChangeRequired: false,
};

function loginRequest(
  body = JSON.stringify({
    username: 'chef.manager',
    password: 'test-password',
  }),
  headers: Record<string, string> = {},
): Request {
  return new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  });
}

describe('KMS secure login API route', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedLogin.mockResolvedValue({
      accessToken: 'secret-gateway-token',
      session: validSession,
    });
  });

  it('authenticates and creates an encrypted-cookie session', async () => {
    const response = await POST(loginRequest());

    expect(response.status).toBe(200);

    expect(mockedLogin).toHaveBeenCalledWith('chef.manager', 'test-password');

    expect(mockedSetCookie).toHaveBeenCalledWith('secret-gateway-token', expiresAt);

    const body = await response.json();

    expect(body.nextPath).toBe('/order-queue');
    expect(body.session.role).toBe('KITCHEN_MANAGER');
    expect(body).not.toHaveProperty('accessToken');
    expect(JSON.stringify(body)).not.toContain('secret-gateway-token');

    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('directs first-login users to password change', async () => {
    mockedLogin.mockResolvedValueOnce({
      accessToken: 'secret-gateway-token',
      session: {
        ...validSession,
        passwordChangeRequired: true,
      },
    });

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(body.nextPath).toBe('/change-password');
  });

  it('rejects missing Origin headers', async () => {
    const request = loginRequest();
    request.headers.delete('origin');

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('rejects cross-origin requests', async () => {
    const response = await POST(
      loginRequest(undefined, {
        Origin: 'https://untrusted.example',
      }),
    );

    expect(response.status).toBe(403);
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('rejects cross-site fetch metadata', async () => {
    const response = await POST(
      loginRequest(undefined, {
        'Sec-Fetch-Site': 'cross-site',
      }),
    );

    expect(response.status).toBe(403);
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('requires JSON requests', async () => {
    const response = await POST(
      loginRequest(undefined, {
        'Content-Type': 'text/plain',
      }),
    );

    expect(response.status).toBe(415);
  });

  it('rejects malformed JSON', async () => {
    const response = await POST(loginRequest('not-valid-json'));

    expect(response.status).toBe(400);
  });

  it('rejects oversized request bodies', async () => {
    const response = await POST(loginRequest('x'.repeat(5000)));

    expect(response.status).toBe(413);
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('rejects missing credentials', async () => {
    const response = await POST(
      loginRequest(
        JSON.stringify({
          username: '',
          password: '',
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('returns a safe message for invalid credentials', async () => {
    mockedLogin.mockRejectedValueOnce(
      new ApiError('Sensitive Gateway error', 'unauthenticated', 401),
    );

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid username or password');
    expect(JSON.stringify(body)).not.toContain('Sensitive Gateway error');
  });

  it('handles Gateway connectivity failures', async () => {
    mockedLogin.mockRejectedValueOnce(new ApiError('Gateway unreachable', 'network'));

    const response = await POST(loginRequest());

    expect(response.status).toBe(503);
  });

  it('handles session cookie failures safely', async () => {
    mockedSetCookie.mockRejectedValueOnce(new Error('Encryption configuration missing'));

    const response = await POST(loginRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(JSON.stringify(body)).not.toContain('Encryption configuration missing');
  });
});
