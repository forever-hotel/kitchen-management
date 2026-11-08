import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GatewayKitchenSession {
  sub: string;
  role: string;
  expiresAt: number;
  passwordChangeRequired: boolean;
}

/**
 * Verifies kitchen access with the authoritative Gateway session endpoint.
 * Does not trust caller-provided role headers or unverified JWT claims.
 */
@Injectable()
export class KmsKitchenReadGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string | string[] };
    }>();
    const { authorization } = request.headers;

    if (
      typeof authorization !== 'string' ||
      authorization.length > 8200 ||
      !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
        authorization,
      )
    ) {
      throw new UnauthorizedException('A valid staff session is required');
    }

    const sessionUrl = this.config.get<string>('KMS_GATEWAY_AUTH_SESSION_URL');
    if (!sessionUrl) {
      throw new ServiceUnavailableException(
        'Kitchen authorization is not configured',
      );
    }

    let response: Response;
    try {
      response = await fetch(sessionUrl, {
        method: 'GET',
        headers: {
          Authorization: authorization,
          Accept: 'application/json',
          'Cache-Control': 'no-store',
        },
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(3500),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Kitchen authorization is unavailable',
      );
    }

    if (response.status === 401) {
      throw new UnauthorizedException(
        'The staff session is invalid or expired',
      );
    }
    if (response.status === 403) {
      throw new ForbiddenException('The staff session cannot access KMS');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'Kitchen authorization is unavailable',
      );
    }

    let payload: unknown;
    try {
      payload = (await response.json()) as unknown;
    } catch {
      throw new ServiceUnavailableException(
        'Invalid authorization service response',
      );
    }

    if (!this.isVerifiedSession(payload)) {
      throw new UnauthorizedException(
        'The staff session could not be verified',
      );
    }
    if (
      !['KITCHEN_MANAGER', 'KITCHEN_STAFF'].includes(payload.role) ||
      payload.passwordChangeRequired
    ) {
      throw new ForbiddenException('Kitchen workspace access is required');
    }
    return true;
  }

  private isVerifiedSession(value: unknown): value is GatewayKitchenSession {
    if (typeof value !== 'object' || value === null) return false;
    const session = value as Partial<GatewayKitchenSession>;
    return (
      typeof session.sub === 'string' &&
      session.sub.length > 0 &&
      typeof session.role === 'string' &&
      typeof session.passwordChangeRequired === 'boolean' &&
      typeof session.expiresAt === 'number' &&
      Number.isFinite(session.expiresAt) &&
      session.expiresAt > Math.floor(Date.now() / 1000)
    );
  }
}
