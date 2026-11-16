import { LiveOrderQueueScreen } from '@/features/orders/components/live-order-queue-screen';
import { requireKmsWorkspaceSession } from '../../../lib/auth/kms-workspace-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Authenticated kitchen workspace. Orders load through the server-side BFF. */
export default async function OrderQueuePage() {
  await requireKmsWorkspaceSession();
  return <LiveOrderQueueScreen />;
}
