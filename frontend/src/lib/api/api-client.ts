import { buildGatewayUrl } from '@/config/gateway';

import { ApiError, classifyHttpStatus } from './api-error';

export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;

function getErrorMessage(body: unknown, status: number): string {
  if (
    body !== null &&
    typeof body === 'object' &&
    'message' in body &&
    typeof body.message === 'string'
  ) {
    return body.message;
  }

  return `API Gateway request failed with HTTP ${status}`;
}

function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

/**
 * Shared API Gateway HTTP client.
 *
 * Intended for Next.js server-side use only.
 * Access tokens must be supplied by trusted server-side
 * authentication code, never from browser storage.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...requestOptions } = options;

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('timeoutMs must be a positive number');
  }

  // Validate the destination before making any network request.
  const url = buildGatewayUrl(path);

  const controller = new AbortController();
  let timedOut = false;

  const onAbort = () => controller.abort();

  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener('abort', onAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const headers = new Headers(requestOptions.headers);

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (typeof requestOptions.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...requestOptions,
      headers,
      signal: controller.signal,
      redirect: 'manual',
      cache: 'no-store',
    });

    if (!response.ok) {
      let body: unknown = null;

      try {
        body = parseJson(await response.text());
      } catch {
        // Use the HTTP status if the error body is not JSON.
      }

      throw new ApiError(
        getErrorMessage(body, response.status),
        classifyHttpStatus(response.status),
        response.status,
      );
    }

    if (
      response.status === 204 ||
      response.status === 205 ||
      requestOptions.method?.toUpperCase() === 'HEAD'
    ) {
      return undefined as T;
    }

    let body: unknown;

    try {
      body = parseJson(await response.text());
    } catch {
      throw new ApiError(
        'API Gateway returned an invalid JSON response',
        'invalid-response',
        response.status,
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (timedOut) {
      throw new ApiError('API Gateway request timed out', 'timeout');
    }

    throw new ApiError(
      controller.signal.aborted
        ? 'API Gateway request was cancelled'
        : 'Unable to connect to API Gateway',
      'network',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
