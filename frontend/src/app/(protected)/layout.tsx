import type { PropsWithChildren } from 'react';

import { KmsShell } from '@/components/layout/kms-shell';

/**
 * Temporary development-only preview.
 *
 * DDP-235 authentication must replace this
 * with its authenticated, role-aware layout
 * before integration or deployment.
 */
export default function WorkspaceLayout({ children }: PropsWithChildren) {
  const previewNavigation = process.env.NODE_ENV === 'development';

  return <KmsShell previewNavigation={previewNavigation}>{children}</KmsShell>;
}
