/** @jest-environment node */

jest.mock('server-only', () => ({}), {
  virtual: true,
});

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: jest.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

jest.mock('./kms-gateway-auth', () => ({
  validateKmsGatewaySession: jest.fn(),
}));

jest.mock('./kms-session-store', () => ({
  getKmsSessionToken: jest.fn(),
}));

import { notFound, redirect } from 'next/navigation';

import { ApiError } from '../api/api-error';
import { validateKmsGatewaySession } from './kms-gateway-auth';
import { getKmsSessionToken } from './kms-session-store';
import { requireKmsManagerSession, requireKmsWorkspaceSession } from './kms-workspace-access';

const mockedGetToken = jest.mocked(getKmsSessionToken);
const mockedValidate = jest.mocked(validateKmsGatewaySession);

const expiresAt = Math.floor(Date.now() / 1000) + 3600;

const managerSession = {
  sub: 'manager-123',
  username: 'chef.manager',
  role: 'KITCHEN_MANAGER' as const,
  expiresAt,
  passwordChangeRequired: false,
};

describe('KMS server-side workspace authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedGetToken.mockResolvedValue({
      accessToken: 'server-only-jwt',
      expiresAt,
    });

    mockedValidate.mockResolvedValue(managerSession);
  });

  it('allows authenticated kitchen managers', async () => {
    const session = await requireKmsWorkspaceSession();

    expect(session.role).toBe('KITCHEN_MANAGER');
    expect(mockedValidate).toHaveBeenCalledWith('server-only-jwt');
  });

  it('allows authenticated kitchen staff to use the workspace', async () => {
    mockedValidate.mockResolvedValueOnce({
      ...managerSession,
      role: 'KITCHEN_STAFF',
    });

    const session = await requireKmsWorkspaceSession();

    expect(session.role).toBe('KITCHEN_STAFF');
  });

  it('redirects missing sessions to login', async () => {
    mockedGetToken.mockResolvedValueOnce(null);

    await expect(requireKmsWorkspaceSession()).rejects.toThrow('REDIRECT:/login');

    expect(redirect).toHaveBeenCalledWith('/login');
    expect(mockedValidate).not.toHaveBeenCalled();
  });

  it('redirects revoked sessions to login', async () => {
    mockedValidate.mockRejectedValueOnce(new ApiError('Revoked', 'unauthenticated', 401));

    await expect(requireKmsWorkspaceSession()).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects forbidden sessions to login', async () => {
    mockedValidate.mockRejectedValueOnce(new ApiError('Forbidden', 'forbidden', 403));

    await expect(requireKmsWorkspaceSession()).rejects.toThrow('REDIRECT:/login');
  });

  it('requires first-login password changes', async () => {
    mockedValidate.mockResolvedValueOnce({
      ...managerSession,
      passwordChangeRequired: true,
    });

    await expect(requireKmsWorkspaceSession()).rejects.toThrow('REDIRECT:/change-password');

    expect(redirect).toHaveBeenCalledWith('/change-password');
  });

  it('denies access when Gateway is unavailable', async () => {
    mockedValidate.mockRejectedValueOnce(new ApiError('Gateway offline', 'network'));

    await expect(requireKmsWorkspaceSession()).rejects.toThrow(
      'KMS authentication service temporarily unavailable',
    );
  });

  it('allows a kitchen manager into manager-only pages', async () => {
    const session = await requireKmsManagerSession();

    expect(session.role).toBe('KITCHEN_MANAGER');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('denies kitchen staff access to manager-only pages', async () => {
    mockedValidate.mockResolvedValueOnce({
      ...managerSession,
      role: 'KITCHEN_STAFF',
    });

    await expect(requireKmsManagerSession()).rejects.toThrow('NOT_FOUND');

    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('fails closed when encrypted session storage fails', async () => {
    mockedGetToken.mockRejectedValueOnce(new Error('Encryption failure'));

    await expect(requireKmsWorkspaceSession()).rejects.toThrow(
      'KMS authentication service temporarily unavailable',
    );

    expect(mockedValidate).not.toHaveBeenCalled();
  });
});
