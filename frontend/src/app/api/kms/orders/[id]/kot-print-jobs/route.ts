import { kmsRequestOrigin } from '@/lib/auth/kms-request-origin';
import { ApiError } from '../../../../../../lib/api/api-error';
import {
  backendOrderRequest,
  orderApiErrorResponse,
  orderApiResponse,
} from '../../../../../../features/orders/api/orders-bff.server';
import {
  parseKotPrintJob,
  parseKotPrintJobs,
  parseKotPrintRequest,
} from '../../../../../../features/orders/api/kot-print-jobs.contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };
const UUID = /^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

function checkId(id: string): void {
  if (!UUID.test(id)) throw new ApiError('Invalid order identifier', 'validation', 400);
}

function verifyOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if (
    !origin ||
    origin !== kmsRequestOrigin(request) ||
    (site && site !== 'same-origin' && site !== 'none')
  ) {
    throw new ApiError('Forbidden request origin', 'forbidden', 403);
  }
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > 512)) {
    throw new ApiError('Invalid request size', 'validation', 413);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new ApiError('JSON content type required', 'validation', 415);
  }
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const { id } = await context.params;
    checkId(id);
    const rows = await backendOrderRequest(`/api/v1/orders/${id}/kot-print-jobs`);
    return orderApiResponse(parseKotPrintJobs(rows, id));
  } catch (error) {
    return orderApiErrorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    verifyOrigin(request);
    const { id } = await context.params;
    checkId(id);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ApiError('Invalid print action request', 'validation', 400);
    }
    const { action, kotId } = payload as Record<string, unknown>;
    if (action === 'request' && kotId === undefined) {
      const result = await backendOrderRequest(`/api/v1/orders/${id}/kot-print-jobs`, 'POST');
      return orderApiResponse(parseKotPrintRequest(result, id));
    }
    if (action === 'cancel' && typeof kotId === 'string' && UUID.test(kotId)) {
      const result = await backendOrderRequest(
        `/api/v1/orders/${id}/kot-print-jobs/${kotId}/cancel`,
        'POST',
      );
      const job = parseKotPrintJob(result);
      if (job.orderId !== id || job.kotId !== kotId || job.printStatus !== 'CANCELLED') {
        throw new ApiError('Invalid cancellation result', 'invalid-response', 502);
      }
      return orderApiResponse(job);
    }
    throw new ApiError('Unsupported print-job action', 'validation', 400);
  } catch (error) {
    return orderApiErrorResponse(error);
  }
}
