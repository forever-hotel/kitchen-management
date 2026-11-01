import 'server-only';

import { notFound, redirect } from 'next/navigation';

import type { KmsStaffSession } from '../../types/gateway-auth';
import { ApiError } from '../api/api-error';
import { validateKmsGatewaySession } from './kms-gateway-auth';
import { getKmsSessionToken } from './kms-session-store';

const SERVICE_UNAVAILABLE = 'KMS authentication service temporarily unavailable';

/**
 * Validate the live Gateway session before allowing
 * access to a Kitchen Management operational page.
 *
 * The browser never receives the Gateway JWT.
 */
export async function requireKmsWorkspaceSession(): Promise<KmsStaffSession> {
  let storedSession: Awaited<ReturnType<typeof getKmsSessionToken>>;

  try {
    storedSession = await getKmsSessionToken();
  } catch {
    // Fail closed if encrypted session storage fails.
    throw new Error(SERVICE_UNAVAILABLE);
  }

  if (!storedSession) {
    redirect('/login');
  }

  let session: KmsStaffSession;

  try {
    session = await validateKmsGatewaySession(storedSession.accessToken);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.kind === 'unauthenticated' || error.kind === 'forbidden')
    ) {
      redirect('/login');
    }

    // Network errors must never grant access.
    throw new Error(SERVICE_UNAVAILABLE);
  }

  if (session.passwordChangeRequired) {
    redirect('/change-password');
  }

  return session;
}

/**
 * Manager-only operations must be checked on the server.
 */
export async function requireKmsManagerSession(): Promise<KmsStaffSession> {
  const session = await requireKmsWorkspaceSession();

  if (session.role !== 'KITCHEN_MANAGER') {
    notFound();
  }

  return session;
}
