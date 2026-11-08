import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { KmsOrderIntakeGuard } from './kms-order-intake.guard.js';

const secret = '01234567890123456789012345678901';

function context(authorization?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}

function guard(token?: string): KmsOrderIntakeGuard {
  return new KmsOrderIntakeGuard({
    get: () => token,
  } as unknown as ConfigService);
}

describe('DDP-263 order intake protection', () => {
  it('fails closed when no long service credential is configured', () => {
    expect(() => guard().canActivate(context(`Bearer ${secret}`))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('accepts only an exact server-configured credential', () => {
    expect(guard(secret).canActivate(context(`Bearer ${secret}`))).toBe(true);
    expect(() => guard(secret).canActivate(context('Bearer wrong'))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard(secret).canActivate(context())).toThrow(
      UnauthorizedException,
    );
  });
});
