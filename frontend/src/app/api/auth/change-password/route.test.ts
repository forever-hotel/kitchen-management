/** @jest-environment node */

jest.mock('../../../../lib/auth/kms-gateway-auth', () => ({
  changeKmsStaffPassword: jest.fn(),
  validateKmsGatewaySession: jest.fn(),
}));

jest.mock('../../../../lib/auth/kms-session-store', () => ({
  getKmsSessionToken: jest.fn(),
  setKmsSessionCookie: jest.fn(),
  clearKmsSessionCookie: jest.fn(),
}));

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

import { POST } from './route';

const mockedChange = jest.mocked(changeKmsStaffPassword);
const mockedValidate = jest.mocked(validateKmsGatewaySession);
const mockedGetToken = jest.mocked(getKmsSessionToken);
const mockedSetCookie = jest.mocked(setKmsSessionCookie);
const mockedClearCookie = jest.mocked(clearKmsSessionCookie);

const expiresAt = Math.floor(Date.now() / 1000) + 3600;

const validSession = {
  sub: 'worker-123',
  username: 'chef.manager',
  role: 'KITCHEN_MANAGER' as const,
  expiresAt,
  passwordChangeRequired: false,
};

const OLD_TOKEN = 'old-secret-jwt';
const NEW_TOKEN = 'new-secret-jwt';

function passwordRequest(
  body = JSON.stringify({
    currentPassword: 'OldPassword123!',
    newPassword: 'NewPassword123!',
  }),
  headers: Record<string, string> = {},
): Request {
  return new Request('http://localhost:3000/api/auth/change-password', {
    method: 'POST',
    headers: {
      Origin: 'http://localhost:3000',
      'Content-Type': 'application/json',
      ...headers,
    },
    body,
  });
}

describe('KMS first-login password change API', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetToken.mockResolvedValue({
      accessToken: OLD_TOKEN,
      expiresAt,
    });

    // The Gateway requires a password change at login.
    mockedValidate.mockResolvedValue({
      ...validSession,
      passwordChangeRequired: true,
    });

    // After the password change, the requirement clears.
    mockedChange.mockResolvedValue({
      accessToken: NEW_TOKEN,
      session: validSession,
    });

    mockedSetCookie.mockResolvedValue(undefined);
    mockedClearCookie.mockResolvedValue(undefined);
  });

  it('allows required first-login password change', async () => {
    const response = await POST(passwordRequest());

    expect(response.status).toBe(200);

    expect(mockedValidate).toHaveBeenCalledWith(OLD_TOKEN);

    expect(mockedChange).toHaveBeenCalledWith(OLD_TOKEN, 'OldPassword123!', 'NewPassword123!');
  });

  it('rejects ordinary password changes after setup', async () => {
    mockedValidate.mockResolvedValueOnce({
      ...validSession,
      passwordChangeRequired: false,
    });

    const response = await POST(passwordRequest());

    expect(response.status).toBe(403);
    expect(mockedChange).not.toHaveBeenCalled();
    expect(mockedSetCookie).not.toHaveBeenCalled();
  });

  it('allows first-login password change for kitchen staff', async () => {
    mockedValidate.mockResolvedValueOnce({
      ...validSession,
      role: 'KITCHEN_STAFF',
      passwordChangeRequired: true,
    });

    mockedChange.mockResolvedValueOnce({
      accessToken: NEW_TOKEN,
      session: {
        ...validSession,
        role: 'KITCHEN_STAFF',
        passwordChangeRequired: false,
      },
    });

    const response = await POST(passwordRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session.role).toBe('KITCHEN_STAFF');
  });

  it('stores the replacement JWT', async () => {
    await POST(passwordRequest());

    expect(mockedSetCookie).toHaveBeenCalledWith(NEW_TOKEN, expiresAt);
  });

  it('returns safe session information', async () => {
    const response = await POST(passwordRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('password_changed');
    expect(body.nextPath).toBe('/order-queue');
    expect(body.session.passwordChangeRequired).toBe(false);

    expect(JSON.stringify(body)).not.toContain(OLD_TOKEN);
    expect(JSON.stringify(body)).not.toContain(NEW_TOKEN);
    expect(JSON.stringify(body)).not.toContain('OldPassword123!');
    expect(JSON.stringify(body)).not.toContain('NewPassword123!');
  });

  it('rejects users without a session', async () => {
    mockedGetToken.mockResolvedValueOnce(null);

    const response = await POST(passwordRequest());

    expect(response.status).toBe(401);
    expect(mockedValidate).not.toHaveBeenCalled();
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('rejects requests from untrusted origins', async () => {
    const response = await POST(
      passwordRequest(undefined, {
        Origin: 'https://untrusted.example',
      }),
    );

    expect(response.status).toBe(403);
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('rejects requests without an Origin header', async () => {
    const request = passwordRequest();
    request.headers.delete('origin');

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('rejects cross-site fetch metadata', async () => {
    const response = await POST(
      passwordRequest(undefined, {
        'Sec-Fetch-Site': 'cross-site',
      }),
    );

    expect(response.status).toBe(403);
  });

  it('requires JSON content type', async () => {
    const response = await POST(
      passwordRequest(undefined, {
        'Content-Type': 'text/plain',
      }),
    );

    expect(response.status).toBe(415);
  });

  it('rejects malformed JSON', async () => {
    const response = await POST(passwordRequest('invalid-json'));

    expect(response.status).toBe(400);
  });

  it('rejects oversized request bodies', async () => {
    const response = await POST(passwordRequest('x'.repeat(5000)));

    expect(response.status).toBe(413);
  });

  it('rejects short new passwords', async () => {
    const response = await POST(
      passwordRequest(
        JSON.stringify({
          currentPassword: 'OldPassword123!',
          newPassword: 'short',
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('rejects reusing the current password', async () => {
    const response = await POST(
      passwordRequest(
        JSON.stringify({
          currentPassword: 'OldPassword123!',
          newPassword: 'OldPassword123!',
        }),
      ),
    );

    expect(response.status).toBe(400);
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('handles incorrect current passwords', async () => {
    mockedChange.mockRejectedValueOnce(
      new ApiError('Sensitive authentication error', 'unauthenticated', 401),
    );

    const response = await POST(passwordRequest());

    expect(response.status).toBe(401);
    expect(mockedSetCookie).not.toHaveBeenCalled();
  });

  it('handles forbidden Gateway requests', async () => {
    mockedValidate.mockRejectedValueOnce(new ApiError('Forbidden', 'forbidden', 403));

    const response = await POST(passwordRequest());

    expect(response.status).toBe(403);
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('handles Gateway network failures', async () => {
    mockedValidate.mockRejectedValueOnce(new ApiError('Connection failed', 'network'));

    const response = await POST(passwordRequest());

    expect(response.status).toBe(503);
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('rejects invalid Gateway session responses', async () => {
    mockedValidate.mockRejectedValueOnce(
      new ApiError('Invalid Gateway response', 'invalid-response'),
    );

    const response = await POST(passwordRequest());

    expect(response.status).toBe(502);
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('rejects unexpected password-change requirements', async () => {
    mockedChange.mockResolvedValueOnce({
      accessToken: NEW_TOKEN,
      session: {
        ...validSession,
        passwordChangeRequired: true,
      },
    });

    const response = await POST(passwordRequest());

    expect(response.status).toBe(502);
    expect(mockedSetCookie).not.toHaveBeenCalled();
    expect(mockedClearCookie).toHaveBeenCalled();
  });

  it('handles encrypted-cookie update failures', async () => {
    mockedSetCookie.mockRejectedValueOnce(new Error('Encryption failure'));

    const response = await POST(passwordRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(mockedClearCookie).toHaveBeenCalled();

    expect(body.error).toContain('Please sign in again');
    expect(JSON.stringify(body)).not.toContain(NEW_TOKEN);
  });
});
