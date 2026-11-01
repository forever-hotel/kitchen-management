import 'server-only';

import { apiRequest } from '../api/api-client';
import { ApiError } from '../api/api-error';
import type {
  GatewayChangePasswordRequest,
  GatewayLoginRequest,
  KmsStaffSession,
} from '@/types/gateway-auth';

import { parseKmsStaffSession } from './kms-session';

export interface KmsAuthenticatedSession {
  accessToken: string;
  session: KmsStaffSession;
}

function invalidResponse(): ApiError {
  return new ApiError(
    'API Gateway returned an invalid authentication response',
    'invalid-response',
  );
}

function bearerHeaders(accessToken: string): Record<string, string> {
  if (
    typeof accessToken !== 'string' ||
    !accessToken.trim() ||
    accessToken.length > 8000 ||
    /\s/.test(accessToken)
  ) {
    throw new ApiError('Invalid staff access token', 'unauthenticated', 401);
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

function parseAuthenticatedResponse(value: unknown): KmsAuthenticatedSession {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw invalidResponse();
  }

  const response = value as Record<string, unknown>;

  const session = parseKmsStaffSession(response);

  if (
    !session ||
    typeof response.accessToken !== 'string' ||
    !response.accessToken.trim() ||
    response.accessToken.length > 8000 ||
    /\s/.test(response.accessToken)
  ) {
    throw invalidResponse();
  }

  return {
    accessToken: response.accessToken,
    session,
  };
}

/**
 * Authenticate a KMS employee using the shared Gateway.
 */
export async function loginKmsStaff(
  username: string,
  password: string,
): Promise<KmsAuthenticatedSession> {
  if (
    typeof username !== 'string' ||
    !username.trim() ||
    username.length > 100 ||
    typeof password !== 'string' ||
    !password
  ) {
    throw new ApiError('Username and password are required', 'validation', 400);
  }

  const request: GatewayLoginRequest = {
    username: username.trim(),
    password,
    subsystem: 'kms',
  };

  const response = await apiRequest<unknown>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  return parseAuthenticatedResponse(response);
}

/**
 * Ask the Gateway to validate an existing staff token.
 *
 * This checks the actual Gateway session rather than
 * trusting the encrypted browser cookie alone.
 */
export async function validateKmsGatewaySession(accessToken: string): Promise<KmsStaffSession> {
  const response = await apiRequest<unknown>('/auth/session', {
    method: 'GET',
    headers: bearerHeaders(accessToken),
  });

  const session = parseKmsStaffSession(response);

  if (!session) {
    throw invalidResponse();
  }

  return session;
}

/**
 * Revoke an authenticated staff session at the Gateway.
 */
export async function logoutKmsStaff(accessToken: string): Promise<void> {
  const response = await apiRequest<unknown>('/auth/logout', {
    method: 'POST',
    headers: bearerHeaders(accessToken),
  });

  if (
    response === null ||
    typeof response !== 'object' ||
    !('status' in response) ||
    response.status !== 'signed_out'
  ) {
    throw invalidResponse();
  }
}

/**
 * Change a staff password and receive the replacement
 * JWT issued by the Gateway.
 */
export async function changeKmsStaffPassword(
  accessToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<KmsAuthenticatedSession> {
  const request: GatewayChangePasswordRequest = {
    currentPassword,
    newPassword,
  };

  const response = await apiRequest<unknown>('/auth/change-password', {
    method: 'POST',
    headers: bearerHeaders(accessToken),
    body: JSON.stringify(request),
  });

  return parseAuthenticatedResponse(response);
}
