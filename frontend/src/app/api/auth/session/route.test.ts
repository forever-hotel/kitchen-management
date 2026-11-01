/** @jest-environment node */

jest.mock('../../../../lib/auth/kms-session-store', () => ({
  getKmsSessionToken: jest.fn(),
}));

jest.mock('../../../../lib/auth/kms-gateway-auth', () => ({
  validateKmsGatewaySession: jest.fn(),
}));

import { ApiError } from '../../../../lib/api/api-error';
import { validateKmsGatewaySession } from '../../../../lib/auth/kms-gateway-auth';
import { getKmsSessionToken } from '../../../../lib/auth/kms-session-store';

import { GET } from './route';

const mockedGetToken = jest.mocked(getKmsSessionToken);
const mockedValidate = jest.mocked(validateKmsGatewaySession);

const expiresAt = Math.floor(Date.now() / 1000) + 3600;

const validSession = {
  sub: 'worker-123',
  username: 'chef.manager',
  role: 'KITCHEN_MANAGER' as const,
  expiresAt,
  passwordChangeRequired: false,
};

describe('KMS staff session API route', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetToken.mockResolvedValue({
      accessToken: 'secret-gateway-jwt',
      expiresAt,
    });

    mockedValidate.mockResolvedValue(validSession);
  });

  it('returns a valid manager session', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(body.session).toEqual(validSession);

    expect(mockedValidate).toHaveBeenCalledWith('secret-gateway-jwt');
  });

  it('accepts a kitchen staff session', async () => {
    mockedValidate.mockResolvedValueOnce({
      ...validSession,
      role: 'KITCHEN_STAFF',
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session.role).toBe('KITCHEN_STAFF');
  });

  it('does not expose JWT access tokens', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).not.toHaveProperty('accessToken');
    expect(body.session).not.toHaveProperty('accessToken');

    expect(JSON.stringify(body)).not.toContain('secret-gateway-jwt');
  });

  it('rejects requests without a session cookie', async () => {
    mockedGetToken.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mockedValidate).not.toHaveBeenCalled();
  });

  it('rejects revoked or invalid Gateway sessions', async () => {
    mockedValidate.mockRejectedValueOnce(
      new ApiError('Gateway rejected token', 'unauthenticated', 401),
    );

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Session expired or invalid');
  });

  it('rejects forbidden Gateway sessions', async () => {
    mockedValidate.mockRejectedValueOnce(new ApiError('Forbidden', 'forbidden', 403));

    const response = await GET();

    expect(response.status).toBe(403);
  });

  it('rejects malformed Gateway responses', async () => {
    mockedValidate.mockRejectedValueOnce(new ApiError('Invalid response', 'invalid-response'));

    const response = await GET();

    expect(response.status).toBe(502);
  });

  it('handles Gateway connectivity failures', async () => {
    mockedValidate.mockRejectedValueOnce(new ApiError('Connection failed', 'network'));

    const response = await GET();

    expect(response.status).toBe(503);
  });

  it('handles Gateway timeouts', async () => {
    mockedValidate.mockRejectedValueOnce(new ApiError('Gateway timed out', 'timeout'));

    const response = await GET();

    expect(response.status).toBe(504);
  });

  it('disables caching of authenticated responses', async () => {
    const response = await GET();

    expect(response.headers.get('cache-control')).toBe('private, no-store');

    expect(response.headers.get('vary')).toBe('Cookie');
  });

  it('handles unexpected session errors safely', async () => {
    mockedGetToken.mockRejectedValueOnce(new Error('Internal server secret'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);

    expect(JSON.stringify(body)).not.toContain('Internal server secret');
  });
});
