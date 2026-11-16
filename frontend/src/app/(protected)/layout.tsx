import type { PropsWithChildren } from 'react';

import { KmsShell } from '../../components/layout/kms-shell';
import { requireKmsWorkspaceSession } from '../../lib/auth/kms-workspace-access';
import { KmsRealtime } from '../../components/kms-realtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Live Gateway session and role always control protected KMS navigation. */
export default async function WorkspaceLayout({ children }: PropsWithChildren) {
  const session = await requireKmsWorkspaceSession();

  return (
    <KmsShell role={session.role}>
      <KmsRealtime />
      {children}
    </KmsShell>
  );
}
