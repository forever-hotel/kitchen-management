import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { loadKotPreview } from '../../../../../features/orders/api/kot-preview.server';
import { KotTicketPreview } from '../../../../../features/orders/components/kot-ticket-preview';
import { ApiError } from '../../../../../lib/api/api-error';
import { requireKmsWorkspaceSession } from '../../../../../lib/auth/kms-workspace-access';
import styles from './kot-preview-page.module.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function KotPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireKmsWorkspaceSession();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  let ticket: Awaited<ReturnType<typeof loadKotPreview>>;
  try {
    ticket = await loadKotPreview(id);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.kind === 'not-found') notFound();
      if (error.kind === 'unauthenticated' || error.kind === 'forbidden') redirect('/login');
    }
    throw error;
  }

  return (
    <main className={styles.page}>
      <nav aria-label="Kitchen ticket navigation" className={styles.navigation}>
        <Link href={`/order-queue/${encodeURIComponent(id)}`} className={styles.backLink}>
          <span aria-hidden="true">←</span> Back to Order Details
        </Link>
      </nav>
      <KotTicketPreview ticket={ticket} />
    </main>
  );
}
