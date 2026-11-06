import type { PropsWithChildren } from 'react';

import { KmsShell } from '../../components/layout/kms-shell';
import { requireKmsWorkspaceSession } from '../../lib/auth/kms-workspace-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authenticated KMS workspace.
 * Navigation uses the role validated by the API Gateway.
 */
export default async function WorkspaceLayout({ children }: PropsWithChildren) {
  const session = await requireKmsWorkspaceSession();

  return <KmsShell role={session.role}>{children}</KmsShell>;
}
