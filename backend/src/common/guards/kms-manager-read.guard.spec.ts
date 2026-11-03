import { jest } from '@jest/globals';
import {
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KmsManagerReadGuard } from './kms-manager-read.guard.js';

const bearer = 'Bearer abc.def.ghi';
const future = Math.floor(Date.now() / 1000) + 3600;

function context(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  } as unknown as ExecutionContext;
}

function guard(url?: string): KmsManagerReadGuard {
  return new KmsManagerReadGuard({ get: () => url } as unknown as ConfigService);
}

function session(role: string, passwordChangeRequired = false): Response {
  return new Response(JSON.stringify({
    sub: 'staff-manager-id',
    role,
    expiresAt: future,
    passwordChangeRequired,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('KmsManagerReadGuard (R-02)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('TC-KMS-R02-008: Given no bearer credential, then access is rejected', async () => {
    await expect(guard().canActivate(context())).rejects.toThrow(UnauthorizedException);
  });

  it('TC-KMS-R02-009: Given no configured authorization service, then authorization fails closed', async () => {
    await expect(guard().canActivate(context(bearer))).rejects.toThrow(ServiceUnavailableException);
  });

  it('TC-KMS-R02-010: Given a verified manager session, then access is allowed', async () => {
    const call = jest.spyOn(global, 'fetch').mockResolvedValue(session('KITCHEN_MANAGER'));

    await expect(guard('http://localhost:8080/auth/session').canActivate(context(bearer)))
      .resolves.toBe(true);
    expect(call).toHaveBeenCalledWith(
      'http://localhost:8080/auth/session',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: bearer }) }),
    );
  });

  it('TC-KMS-R02-011: Given Kitchen Staff, then manager API access is forbidden', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(session('KITCHEN_STAFF'));
    await expect(guard('http://localhost:8080/auth/session').canActivate(context(bearer)))
      .rejects.toThrow(ForbiddenException);
  });

  it('TC-KMS-R02-012: Given a mandatory password change, then access is forbidden', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(session('KITCHEN_MANAGER', true));
    await expect(guard('http://localhost:8080/auth/session').canActivate(context(bearer)))
      .rejects.toThrow(ForbiddenException);
  });

  it('TC-KMS-R02-013: Given Gateway 401, then it rejects the session', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
    await expect(guard('http://localhost:8080/auth/session').canActivate(context(bearer)))
      .rejects.toThrow(UnauthorizedException);
  });

  it('TC-KMS-R02-014: Given an unavailable Gateway, then access remains unavailable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(guard('http://localhost:8080/auth/session').canActivate(context(bearer)))
      .rejects.toThrow(ServiceUnavailableException);
  });

  it('TC-KMS-R02-015: Given an expired Gateway session, then access is rejected', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      sub: 'staff-manager-id',
      role: 'KITCHEN_MANAGER',
      expiresAt: 1,
      passwordChangeRequired: false,
    }), { status: 200 }));
    await expect(guard('http://localhost:8080/auth/session').canActivate(context(bearer)))
      .rejects.toThrow(UnauthorizedException);
  });
});
