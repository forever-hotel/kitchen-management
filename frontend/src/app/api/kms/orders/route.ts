import {
  loadActiveKitchenOrders,
  orderApiErrorResponse,
  orderApiResponse,
} from '../../../../features/orders/api/orders-bff.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    const orders = await loadActiveKitchenOrders();
    return orderApiResponse({ items: orders, total: orders.length });
  } catch (error) {
    return orderApiErrorResponse(error);
  }
}
