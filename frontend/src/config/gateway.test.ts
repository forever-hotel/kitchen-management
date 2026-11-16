import { buildGatewayUrl, getGatewayBaseUrl } from './gateway';

describe('KMS API Gateway configuration', () => {
  const originalUrl = process.env.API_GATEWAY_URL;

  beforeEach(() => {
    process.env.API_GATEWAY_URL = 'http://localhost:8080';
  });

  afterAll(() => {
    if (originalUrl === undefined) {
      delete process.env.API_GATEWAY_URL;
    } else {
      process.env.API_GATEWAY_URL = originalUrl;
    }
  });

  it('uses the configured Gateway origin', () => {
    expect(getGatewayBaseUrl()).toBe('http://localhost:8080');
  });

  it('builds the shared staff authentication route', () => {
    expect(buildGatewayUrl('/auth/session')).toBe('http://localhost:8080/auth/session');
  });

  it('builds the KMS service route through the Gateway', () => {
    expect(buildGatewayUrl('/kms/orders')).toBe('http://localhost:8080/kms/orders');
  });

  it('rejects direct backend and unsupported paths', () => {
    expect(() => buildGatewayUrl('/orders')).toThrow('Unsupported API Gateway route');

    expect(() => buildGatewayUrl('https://example.com/kms/orders')).toThrow(
      'Unsupported API Gateway route',
    );

    expect(() => buildGatewayUrl('/kms/../admin')).toThrow('Unsupported API Gateway route');
  });

  it('rejects a missing Gateway configuration', () => {
    delete process.env.API_GATEWAY_URL;

    expect(() => getGatewayBaseUrl()).toThrow('API_GATEWAY_URL is not configured');
  });

  it('rejects Gateway URLs containing credentials', () => {
    process.env.API_GATEWAY_URL = 'https://user:password@example.com';

    expect(() => getGatewayBaseUrl()).toThrow('API_GATEWAY_URL must be an HTTP(S) origin');
  });
});
