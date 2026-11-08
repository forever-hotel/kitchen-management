import { notFound, redirect } from 'next/navigation';

import { loadKitchenOrderDetails } from '../../../../features/orders/api/order-details.server';
import { OrderDetailsScreen } from '../../../../features/orders/components/order-details-screen';
import { ApiError } from '../../../../lib/api/api-error';
import { requireKmsWorkspaceSession } from '../../../../lib/auth/kms-workspace-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface OrderDetailsPageProps {
  params: Promise<{ id: string }>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  await requireKmsWorkspaceSession();
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  let order: Awaited<ReturnType<typeof loadKitchenOrderDetails>>;

  try {
    order = await loadKitchenOrderDetails(id);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.kind === 'not-found') notFound();
      if (error.kind === 'unauthenticated') redirect('/login');
    }
    throw error;
  }

  return <OrderDetailsScreen order={order} />;
}
