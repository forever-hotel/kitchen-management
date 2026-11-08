import { ApiError } from '../../../../../lib/api/api-error';
import {
  backendOrderRequest,
  orderApiErrorResponse,
  orderApiResponse,
  parseKitchenAllergySafety,
} from '../../../../../features/orders/api/orders-bff.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

function checkId(value: string): void {
  if (!UUID.test(value)) throw new ApiError('Invalid food-order identifier', 'validation', 400);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  return (
    origin === new URL(request.url).origin &&
    (!fetchSite || fetchSite === 'same-origin' || fetchSite === 'none')
  );
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    checkId(id);
    const response = await backendOrderRequest(`/api/v1/orders/${id}/allergy-safety`);
    return orderApiResponse(parseKitchenAllergySafety(response));
  } catch (error) {
    return orderApiErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  if (!isSameOrigin(request)) {
    return orderApiErrorResponse(new ApiError('Forbidden request origin', 'forbidden', 403));
  }
  const contentLength = request.headers.get('content-length');
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > 512)) {
    return orderApiErrorResponse(new ApiError('Invalid request size', 'validation', 413));
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return orderApiErrorResponse(new ApiError('JSON content type required', 'validation', 415));
  }
  try {
    const { id } = await context.params;
    checkId(id);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ApiError('Invalid action request', 'validation', 400);
    }
    const { action } = payload as Record<string, unknown>;
    const operations: Record<string, string> = {
      acknowledge: 'allergy-safety/acknowledgements',
      start: 'start-preparation',
      ready: 'mark-ready',
    };
    if (typeof action !== 'string' || !Object.hasOwn(operations, action)) {
      throw new ApiError('Unsupported kitchen action', 'validation', 400);
    }
    const result = await backendOrderRequest(`/api/v1/orders/${id}/${operations[action]}`, 'POST');
    return orderApiResponse(result);
  } catch (error) {
    return orderApiErrorResponse(error);
  }
}
