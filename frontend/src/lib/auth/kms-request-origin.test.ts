/** @jest-environment node */
import { kmsRequestOrigin } from './kms-request-origin';

const originalOrigin = process.env.APP_ORIGIN;
afterEach(() => {
  if (originalOrigin === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = originalOrigin;
});

it('uses the browser origin instead of the internal Docker URL', () => {
  process.env.APP_ORIGIN = 'http://localhost:3005';
  const request = new Request('http://0.0.0.0:3005/api/auth/login', {
    headers: { 'x-forwarded-host': 'attacker.example' },
  });
  expect(kmsRequestOrigin(request)).toBe('http://localhost:3005');
});

it('fails closed when the configured origin is invalid', () => {
  process.env.APP_ORIGIN = 'https://hotel.example/unexpected-path';
  expect(kmsRequestOrigin(new Request('http://localhost:3005'))).toBeNull();
});

it('uses the request origin when no public origin is configured', () => {
  delete process.env.APP_ORIGIN;
  expect(kmsRequestOrigin(new Request('http://localhost:3005/login'))).toBe(
    'http://localhost:3005',
  );
});
