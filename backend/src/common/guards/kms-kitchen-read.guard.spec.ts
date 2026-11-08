import { jest } from '@jest/globals';
import {
  ExecutionContext,
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { KmsKitchenReadGuard } from './kms-kitchen-read.guard.js';

const bearer = 'Bearer abc.def.ghi';
const sessionUrl = 'http://localhost:8080/auth/session';

function context(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

function guard(url?: string): KmsKitchenReadGuard {
  return new KmsKitchenReadGuard({
    get: () => url,
  } as unknown as ConfigService);
}

function session(role: string, passwordChangeRequired = false): Response {
  return new Response(
    JSON.stringify({
      sub: 'staff-id',
      role,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      passwordChangeRequired,
    }),
    { status: 200 },
  );
}

describe('KmsKitchenReadGuard (DDP-258)', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['KITCHEN_STAFF', 'KITCHEN_MANAGER'])(
    'accepts a verified %s role',
    async (role) => {
      jest.spyOn(global, 'fetch').mockResolvedValue(session(role));
      await expect(
        guard(sessionUrl).canActivate(context(bearer)),
      ).resolves.toBe(true);
    },
  );

  it('rejects anonymous access', async () => {
    await expect(guard(sessionUrl).canActivate(context())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('fails closed without an authorization service', async () => {
    await expect(guard().canActivate(context(bearer))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('rejects unrelated roles', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(session('RECEPTIONIST'));
    await expect(
      guard(sessionUrl).canActivate(context(bearer)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an uncompleted mandatory password change', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(session('KITCHEN_STAFF', true));
    await expect(
      guard(sessionUrl).canActivate(context(bearer)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects expired Gateway sessions', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          sub: 'staff-id',
          role: 'KITCHEN_MANAGER',
          expiresAt: 1,
          passwordChangeRequired: false,
        }),
        { status: 200 },
      ),
    );
    await expect(
      guard(sessionUrl).canActivate(context(bearer)),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('denies access when Gateway is unavailable', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(
      guard(sessionUrl).canActivate(context(bearer)),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
