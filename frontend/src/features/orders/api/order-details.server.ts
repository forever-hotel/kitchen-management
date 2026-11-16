import 'server-only';

import { apiRequest } from '../../../lib/api/api-client';
import { ApiError, classifyHttpStatus } from '../../../lib/api/api-error';
import { getKmsSessionToken } from '../../../lib/auth/kms-session-store';
import { parseKitchenOrderDetails, type KitchenOrderDetails } from './order-details.contract';

/**
 * The current API Gateway routes.json preserves the /kms prefix, whereas the
 * NestJS OrdersController is mounted under /api/v1/orders. A deployment may
 * configure a matching Gateway rewrite; until then, KMS_ORDERS_API_ORIGIN
 * permits the Next.js server to call the trusted KMS backend directly.
 * Both transports keep staff tokens server-side and send no browser credentials.
 */
function getTrustedOrdersOrigin(): string | null {
  const raw = process.env.KMS_ORDERS_API_ORIGIN?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('KMS_ORDERS_API_ORIGIN must be an HTTP(S) origin');
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('KMS_ORDERS_API_ORIGIN must be an HTTP(S) origin');
  }
  return url.origin;
}

export async function loadKitchenOrderDetails(orderId: string): Promise<KitchenOrderDetails> {
  const stored = await getKmsSessionToken();
  if (!stored) {
    throw new ApiError('Staff session expired', 'unauthenticated', 401);
  }

  const path = `/api/v1/orders/${encodeURIComponent(orderId)}`;
  const headers = { Authorization: `Bearer ${stored.accessToken}` };
  const origin = getTrustedOrdersOrigin();

  let body: unknown;
  if (origin === null) {
    // Requires the deployed Gateway to rewrite this path to /api/v1/orders/:id.
    body = await apiRequest<unknown>(`/kms${path}`, { headers, method: 'GET' });
  } else {
    let response: Response;
    try {
      response = await fetch(`${origin}${path}`, {
        method: 'GET',
        headers: { ...headers, Accept: 'application/json' },
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new ApiError('Unable to connect to the KMS order service', 'network');
    }
    if (!response.ok) {
      throw new ApiError(
        `Unable to load order details (HTTP ${response.status})`,
        classifyHttpStatus(response.status),
        response.status,
      );
    }
    try {
      body = (await response.json()) as unknown;
    } catch {
      throw new ApiError('Invalid order details response', 'invalid-response');
    }
  }

  try {
    return parseKitchenOrderDetails(body);
  } catch {
    throw new ApiError('Invalid order details response', 'invalid-response');
  }
}
