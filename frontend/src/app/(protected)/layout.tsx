import type { PropsWithChildren } from 'react';

import { KmsShell } from '../../components/layout/kms-shell';
import { requireKmsWorkspaceSession } from '../../lib/auth/kms-workspace-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Shared authenticated KMS workspace shell.
 *
 * The live Gateway role controls navigation visibility.
 * Individual pages independently verify authorization.
 */
export default async function WorkspaceLayout({ children }: PropsWithChildren) {
  const session = await requireKmsWorkspaceSession();

  return <KmsShell role={session.role}>{children}</KmsShell>;
}
