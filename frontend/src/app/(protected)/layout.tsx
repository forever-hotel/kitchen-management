import type { PropsWithChildren } from 'react';

import { KmsShell } from '@/components/layout/kms-shell';

/**
 * The session-backed role and route authorization will be wired under DDP-235.
 * Local preview links are visible only outside production; they grant no API role.
 */
export default function WorkspaceLayout({ children }: PropsWithChildren) {
  return <KmsShell previewNavigation={process.env.NODE_ENV !== 'production'}>{children}</KmsShell>;
}
