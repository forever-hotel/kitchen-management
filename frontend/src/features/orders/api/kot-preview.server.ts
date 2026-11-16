import 'server-only';

import { ApiError } from '../../../lib/api/api-error';
import { backendOrderRequest } from './orders-bff.server';
import { parseKotPreview, type KotPreview } from './kot-preview.contract';

/** JWT is forwarded server-side only through the existing trusted KMS BFF. */
export async function loadKotPreview(orderId: string): Promise<KotPreview> {
  const response = await backendOrderRequest(
    `/api/v1/orders/${encodeURIComponent(orderId)}/kot-preview`,
  );
  try {
    return parseKotPreview(response);
  } catch {
    throw new ApiError('Invalid kitchen ticket preview response', 'invalid-response', 502);
  }
}
