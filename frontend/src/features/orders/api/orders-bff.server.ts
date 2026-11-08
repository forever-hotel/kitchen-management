import 'server-only';

import { apiRequest } from '../../../lib/api/api-client';
import { ApiError, classifyHttpStatus } from '../../../lib/api/api-error';
import { validateKmsGatewaySession } from '../../../lib/auth/kms-gateway-auth';
import { getKmsSessionToken } from '../../../lib/auth/kms-session-store';
import { parseKitchenOrderDetails, type KitchenOrderDetails } from './order-details.contract';

function ordersOrigin(): string | null {
  const raw = process.env.KMS_ORDERS_API_ORIGIN?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('KMS_ORDERS_API_ORIGIN must be an HTTP(S) origin');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
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

/** Only Next.js server code can read the encrypted staff session and forward its JWT. */
export async function backendOrderRequest(
  path: string,
  method: 'GET' | 'POST' = 'GET',
): Promise<unknown> {
  if (!/^\/api\/v1\/orders(?:\?|\/|$)/.test(path)) {
    throw new Error('Unsupported KMS order path');
  }
  const stored = await getKmsSessionToken();
  if (!stored) throw new ApiError('Please sign in again', 'unauthenticated', 401);
  const session = await validateKmsGatewaySession(stored.accessToken);
  if (
    !['KITCHEN_MANAGER', 'KITCHEN_STAFF'].includes(session.role) ||
    session.passwordChangeRequired
  ) {
    throw new ApiError('Kitchen access is required', 'forbidden', 403);
  }

  const headers = { Authorization: `Bearer ${stored.accessToken}` };
  const origin = ordersOrigin();
  if (!origin) {
    // Requires the deployed Gateway route to rewrite /kms/api/v1/orders to /api/v1/orders.
    return apiRequest<unknown>(`/kms${path}`, { method, headers });
  }
  let response: Response;
  try {
    response = await fetch(`${origin}${path}`, {
      method,
      headers: { ...headers, Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new ApiError('Unable to connect to the KMS backend', 'network', 503);
  }
  if (!response.ok) {
    // Never forward the upstream response body or any credentials to the browser.
    throw new ApiError(
      response.status === 409
        ? 'Order state changed or allergy acknowledgement is required. Refresh and retry.'
        : `Kitchen order request failed (HTTP ${response.status})`,
      classifyHttpStatus(response.status),
      response.status,
    );
  }
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new ApiError('Invalid KMS order response', 'invalid-response', 502);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** All active orders, following the backend's approved max-page-size of 100. */
export async function loadActiveKitchenOrders(): Promise<KitchenOrderDetails[]> {
  const result: KitchenOrderDetails[] = [];
  let offset = 0;
  const limit = 100;

  for (let page = 0; page < 20; page += 1) {
    const response = await backendOrderRequest(`/api/v1/orders?limit=${limit}&offset=${offset}`);
    if (
      !isRecord(response) ||
      !Array.isArray(response.items) ||
      !Number.isSafeInteger(response.total) ||
      Number(response.total) < 0
    ) {
      throw new ApiError('Invalid kitchen queue response', 'invalid-response', 502);
    }
    const orders = response.items.map(parseKitchenOrderDetails);
    result.push(
      ...orders.filter((order) => ['PLACED', 'IN_PREPARATION', 'READY'].includes(order.status)),
    );
    offset += orders.length;
    if (offset >= Number(response.total)) {
      return result;
    }
    if (orders.length === 0) {
      throw new ApiError('Incomplete kitchen queue response', 'invalid-response', 502);
    }
  }
  throw new ApiError('Kitchen queue exceeds supported page capacity', 'server', 503);
}

export interface KitchenAllergySafety {
  orderId: string;
  acknowledgementRequired: boolean;
  acknowledged: boolean;
  warnings: {
    allergyNote: string | null;
    itemAllergens: string[];
    dietaryLabels: string[];
  };
}

export function parseKitchenAllergySafety(value: unknown): KitchenAllergySafety {
  if (!isRecord(value) || !isRecord(value.warnings)) {
    throw new ApiError('Invalid allergy-safety response', 'invalid-response', 502);
  }
  const warnings = value.warnings;
  if (
    typeof value.orderId !== 'string' ||
    typeof value.acknowledgementRequired !== 'boolean' ||
    typeof value.acknowledged !== 'boolean' ||
    !(warnings.allergyNote === null || typeof warnings.allergyNote === 'string') ||
    !Array.isArray(warnings.itemAllergens) ||
    !warnings.itemAllergens.every((item) => typeof item === 'string') ||
    !Array.isArray(warnings.dietaryLabels) ||
    !warnings.dietaryLabels.every((item) => typeof item === 'string')
  ) {
    throw new ApiError('Invalid allergy-safety response', 'invalid-response', 502);
  }
  return {
    orderId: value.orderId,
    acknowledgementRequired: value.acknowledgementRequired,
    acknowledged: value.acknowledged,
    warnings: {
      allergyNote: warnings.allergyNote,
      itemAllergens: warnings.itemAllergens as string[],
      dietaryLabels: warnings.dietaryLabels as string[],
    },
  };
}

/** All client-facing errors are deliberate, bounded and contain no JWTs. */
export function orderApiErrorResponse(error: unknown): Response {
  let status = 503;
  let message = 'Kitchen order service unavailable. Please retry.';
  if (error instanceof ApiError) {
    status = error.status ?? 503;
    if (status < 400 || status > 599) status = 503;
    message = error.message;
  }
  return Response.json(
    { error: message },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        Vary: 'Cookie',
      },
    },
  );
}

export function orderApiResponse(value: unknown): Response {
  return Response.json(value, {
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Cookie',
    },
  });
}
