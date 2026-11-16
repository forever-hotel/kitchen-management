/**
 * Centralized API Gateway URL configuration.
 *
 * This module is intended for the Next.js server-side
 * API layer. Do not import it into client components.
 */
export function getGatewayBaseUrl(): string {
  const raw = process.env.API_GATEWAY_URL?.trim();

  if (!raw) {
    throw new Error('API_GATEWAY_URL is not configured');
  }

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new Error('API_GATEWAY_URL must be a valid URL');
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('API_GATEWAY_URL must be an HTTP(S) origin');
  }

  return url.origin;
}

/**
 * Builds a URL for an approved KMS Gateway route.
 *
 * Staff authentication: /auth/*
 * KMS operations:      /kms/*
 */
export function buildGatewayUrl(path: string): string {
  if (!/^\/(auth|kms)(\/|$)/.test(path) || path.includes('\\') || path.includes('#')) {
    throw new Error('Unsupported API Gateway route');
  }

  const baseUrl = getGatewayBaseUrl();
  const url = new URL(path, baseUrl);

  if (url.origin !== baseUrl || !/^\/(auth|kms)(\/|$)/.test(url.pathname)) {
    throw new Error('Unsupported API Gateway route');
  }

  return url.toString();
}
