/**
 * Shared Forever Hotel API Gateway authentication contracts.
 */

export const KMS_ROLES = ['KITCHEN_MANAGER', 'KITCHEN_STAFF'] as const;

export type KmsRole = (typeof KMS_ROLES)[number];

export function isKmsRole(role: unknown): role is KmsRole {
  return role === 'KITCHEN_MANAGER' || role === 'KITCHEN_STAFF';
}

export interface GatewayLoginRequest {
  username: string;
  password: string;
  subsystem: 'kms';
}

/**
 * Raw session response from GET /auth/session.
 *
 * The Gateway can authenticate users from other
 * subsystems, so role must be validated before
 * treating this as a KMS session.
 */
export interface GatewayStaffSession {
  sub: string;
  username: string;
  role: string;
  expiresAt: number;
  passwordChangeRequired: boolean;
}

export interface KmsStaffSession extends Omit<GatewayStaffSession, 'role'> {
  role: KmsRole;
}

export interface GatewayLoginResponse extends GatewayStaffSession {
  accessToken: string;
}

export interface GatewayChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export type GatewayChangePasswordResponse = GatewayLoginResponse;

export interface GatewayLogoutResponse {
  status: 'signed_out';
}
