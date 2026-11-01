import { apiRequest } from './api-client';

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

describe('KMS centralized API Gateway HTTP client', () => {
  const originalFetch = globalThis.fetch;
  const originalGatewayUrl = process.env.API_GATEWAY_URL;
  const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

  beforeEach(() => {
    process.env.API_GATEWAY_URL = 'http://localhost:8080';
    globalThis.fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.fetch = originalFetch;

    if (originalGatewayUrl === undefined) {
      delete process.env.API_GATEWAY_URL;
    } else {
      process.env.API_GATEWAY_URL = originalGatewayUrl;
    }
  });

  it('TC-KMS-API-001: sends requests through the Gateway', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, { orders: [] }));

    const result = await apiRequest<{ orders: string[] }>('/kms/orders');

    expect(result).toEqual({ orders: [] });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/kms/orders',
      expect.objectContaining({
        cache: 'no-store',
        redirect: 'manual',
      }),
    );

    const options = fetchMock.mock.calls[0][1];

    expect(new Headers(options?.headers).get('Accept')).toBe('application/json');
  });

  it('TC-KMS-API-002: handles typed successful responses', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(200, {
        status: 'ok',
        service: 'kms-backend',
      }),
    );

    const result = await apiRequest<{
      status: string;
      service: string;
    }>('/kms/health/live');

    expect(result.service).toBe('kms-backend');
    expect(result.status).toBe('ok');
  });

  it('sends JSON requests to Gateway authentication routes', async () => {
    fetchMock.mockResolvedValue(mockResponse(200, { authenticated: true }));

    await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'test-user',
        password: 'test-password',
        subsystem: 'kms',
      }),
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/auth/login', expect.any(Object));

    const options = fetchMock.mock.calls[0][1];

    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json');
  });

  it.each([
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [429, 'rate-limited'],
  ] as const)('TC-KMS-API-003: maps HTTP %i to %s', async (status, kind) => {
    fetchMock.mockResolvedValue(
      mockResponse(status, {
        code: 'REQUEST_REJECTED',
        message: 'Request rejected',
      }),
    );

    await expect(apiRequest('/kms/orders')).rejects.toMatchObject({
      name: 'ApiError',
      status,
      kind,
      message: 'Request rejected',
    });
  });

  it('TC-KMS-API-004: handles network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiRequest('/kms/orders')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'network',
      status: null,
    });
  });

  it('TC-KMS-API-004: aborts requests after timeout', async () => {
    jest.useFakeTimers();

    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise<Response>((_resolve, reject) => {
          options?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );

    const request = apiRequest('/kms/orders', {
      timeoutMs: 100,
    });

    const assertion = expect(request).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'timeout',
      status: null,
    });

    await jest.advanceTimersByTimeAsync(100);
    await assertion;
  });

  it('rejects invalid JSON returned by the Gateway', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('invalid json'),
    } as unknown as Response);

    await expect(apiRequest('/kms/orders')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'invalid-response',
      status: 200,
    });
  });

  it('handles successful responses without a body', async () => {
    fetchMock.mockResolvedValue(mockResponse(204, null));

    await expect(
      apiRequest<void>('/auth/logout', {
        method: 'POST',
      }),
    ).resolves.toBeUndefined();
  });
});
