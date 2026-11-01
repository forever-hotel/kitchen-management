/**
 * Standard error categories for KMS API communication.
 *
 * Shared infrastructure only: no feature-specific
 * error messages or business rules belong here.
 */
export type ApiErrorKind =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'server'
  | 'http'
  | 'network'
  | 'timeout'
  | 'invalid-response'
  | 'rate-limited';

/**
 * Converts HTTP status codes into application error categories.
 */
export function classifyHttpStatus(status: number): ApiErrorKind {
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 408 || status === 504) return 'timeout';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate-limited';
  if (status >= 500 && status <= 599) return 'server';

  return 'http';
}

/**
 * Standard error returned by the shared HTTP client.
 *
 * Callers can inspect the kind and status without
 * depending on endpoint-specific error formats.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;

  constructor(message: string, kind: ApiErrorKind, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}
