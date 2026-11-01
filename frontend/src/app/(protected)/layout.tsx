import type { PropsWithChildren } from 'react';

import { KmsShell } from '@/components/layout/kms-shell';

/**
 * Shared layout for kitchen operational pages.
 *
 * Authentication and server-side route protection
 * will be connected under DDP-235.
 */
export default function WorkspaceLayout({ children }: PropsWithChildren) {
  return <KmsShell>{children}</KmsShell>;
}
