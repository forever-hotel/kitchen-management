import { ApiError, classifyHttpStatus } from './api-error';

describe('KMS shared API error handling', () => {
  it.each([
    [400, 'validation'],
    [422, 'validation'],
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [429, 'rate-limited'],
    [500, 'server'],
    [502, 'server'],
    [503, 'server'],
    [408, 'timeout'],
    [504, 'timeout'],
    [418, 'http'],
  ] as const)('TC-KMS-API-003: maps HTTP %i to %s', (status, expectedKind) => {
    expect(classifyHttpStatus(status)).toBe(expectedKind);
  });

  it('preserves the HTTP status and error category', () => {
    const error = new ApiError('Access denied', 'forbidden', 403);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe('Access denied');
    expect(error.kind).toBe('forbidden');
    expect(error.status).toBe(403);
  });

  it('supports network errors without an HTTP status', () => {
    const error = new ApiError('Unable to connect to API Gateway', 'network');

    expect(error.kind).toBe('network');
    expect(error.status).toBeNull();
  });
});
