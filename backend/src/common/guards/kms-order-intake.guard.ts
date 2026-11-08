import { timingSafeEqual } from 'node:crypto';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** A separate credential for the trusted food-order submitter, never for guests. */
@Injectable()
export class KmsOrderIntakeGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configured = this.config.get<string>('KMS_ORDER_INTAKE_TOKEN');
    if (typeof configured !== 'string' || configured.length < 32) {
      throw new ServiceUnavailableException(
        'Food-order intake is not configured',
      );
    }
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string | string[] };
    }>();
    const { authorization } = request.headers;
    if (
      typeof authorization !== 'string' ||
      !authorization.startsWith('Bearer ') ||
      authorization.length > 8200
    ) {
      throw new UnauthorizedException(
        'A valid order intake credential is required',
      );
    }
    const supplied = authorization.slice(7);
    const expectedBytes = Buffer.from(configured, 'utf8');
    const suppliedBytes = Buffer.from(supplied, 'utf8');
    if (
      suppliedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(suppliedBytes, expectedBytes)
    ) {
      throw new UnauthorizedException(
        'A valid order intake credential is required',
      );
    }
    return true;
  }
}
