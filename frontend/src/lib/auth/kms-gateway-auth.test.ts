jest.mock('server-only', () => ({}), { virtual: true });

jest.mock('../api/api-client', () => ({
  apiRequest: jest.fn(),
}));
import { apiRequest } from '../api/api-client';
import { ApiError } from '../api/api-error';

import {
  changeKmsStaffPassword,
  loginKmsStaff,
  logoutKmsStaff,
  validateKmsGatewaySession,
} from './kms-gateway-auth';

const mockedRequest = jest.mocked(apiRequest);

function gatewayResponse() {
  return {
    sub: 'worker-123',
    username: 'chef.manager',
    role: 'KITCHEN_MANAGER',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    passwordChangeRequired: false,
    accessToken: 'header.payload.signature',
  };
}

describe('KMS Gateway authentication integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs in through Gateway with the kms subsystem', async () => {
    mockedRequest.mockResolvedValueOnce(gatewayResponse());

    const result = await loginKmsStaff('chef.manager', 'test-password');

    expect(mockedRequest).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'chef.manager',
        password: 'test-password',
        subsystem: 'kms',
      }),
    });

    expect(result.accessToken).toBe('header.payload.signature');

    expect(result.session.role).toBe('KITCHEN_MANAGER');
    expect(result.session).not.toHaveProperty('accessToken');
  });

  it('rejects invalid login input before contacting Gateway', async () => {
    await expect(loginKmsStaff('', '')).rejects.toMatchObject({
      kind: 'validation',
      status: 400,
    });

    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it('rejects an unauthorized Gateway role', async () => {
    mockedRequest.mockResolvedValueOnce({
      ...gatewayResponse(),
      role: 'RECEPTIONIST',
    });

    await expect(loginKmsStaff('chef.manager', 'test-password')).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });

  it('rejects a login response without a token', async () => {
    const response = gatewayResponse();

    mockedRequest.mockResolvedValueOnce({
      ...response,
      accessToken: '',
    });

    await expect(loginKmsStaff('chef.manager', 'test-password')).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });

  it('validates the staff session through Gateway', async () => {
    mockedRequest.mockResolvedValueOnce(gatewayResponse());

    const result = await validateKmsGatewaySession('header.payload.signature');

    expect(mockedRequest).toHaveBeenCalledWith('/auth/session', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer header.payload.signature',
      },
    });

    expect(result.role).toBe('KITCHEN_MANAGER');
    expect(result).not.toHaveProperty('accessToken');
  });

  it('rejects expired Gateway session responses', async () => {
    mockedRequest.mockResolvedValueOnce({
      ...gatewayResponse(),
      expiresAt: 1,
    });

    await expect(validateKmsGatewaySession('header.payload.signature')).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });

  it('does not send invalid bearer tokens', async () => {
    await expect(validateKmsGatewaySession('invalid token')).rejects.toMatchObject({
      kind: 'unauthenticated',
      status: 401,
    });

    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it('revokes sessions using Gateway logout', async () => {
    mockedRequest.mockResolvedValueOnce({
      status: 'signed_out',
    });

    await logoutKmsStaff('header.payload.signature');

    expect(mockedRequest).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer header.payload.signature',
      },
    });
  });

  it('changes passwords through Gateway and reads the replacement token', async () => {
    mockedRequest.mockResolvedValueOnce({
      ...gatewayResponse(),
      accessToken: 'new.header.signature',
      passwordChangeRequired: false,
    });

    const result = await changeKmsStaffPassword(
      'header.payload.signature',
      'old-password',
      'new-password',
    );

    expect(mockedRequest).toHaveBeenCalledWith('/auth/change-password', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer header.payload.signature',
      },
      body: JSON.stringify({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    });

    expect(result.accessToken).toBe('new.header.signature');
    expect(result.session.passwordChangeRequired).toBe(false);
  });

  it('preserves Gateway authentication failures', async () => {
    mockedRequest.mockRejectedValueOnce(new ApiError('Unauthorized', 'unauthenticated', 401));

    await expect(loginKmsStaff('chef.manager', 'wrong-password')).rejects.toMatchObject({
      kind: 'unauthenticated',
      status: 401,
    });
  });
});
