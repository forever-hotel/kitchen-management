import type { PropsWithChildren } from 'react';

import { KmsShell } from '@/components/layout/kms-shell';

/**
 * Temporary development-only navigation preview.
 * DDP-235 must supply authenticated role-based access
 * before the application is integrated or deployed.
 */
export default function WorkspaceLayout({
  children,
}: PropsWithChildren) {
  const previewNavigation =
    process.env.NODE_ENV !== 'production';

  return (
    <KmsShell previewNavigation={previewNavigation}>
      {children}
    </KmsShell>
  );
}
