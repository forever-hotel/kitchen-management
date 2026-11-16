import { redirect } from 'next/navigation';

import { ApiError } from '../../../lib/api/api-error';
import { validateKmsGatewaySession } from '../../../lib/auth/kms-gateway-auth';
import { getKmsSessionToken } from '../../../lib/auth/kms-session-store';

import PasswordChangeForm from './password-change-form';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const storedSession = await getKmsSessionToken();

  if (!storedSession) {
    redirect('/login');
  }

  let session: Awaited<ReturnType<typeof validateKmsGatewaySession>>;

  try {
    session = await validateKmsGatewaySession(storedSession.accessToken);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.kind === 'unauthenticated' || error.kind === 'forbidden')
    ) {
      redirect('/login');
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <section className="w-full max-w-md text-center">
          <h1 className="text-xl font-semibold">Authentication Unavailable</h1>
          <p className="mt-3">Your session could not be verified. Please try again.</p>
          <a href="/change-password" className="mt-4 inline-block underline">
            Retry
          </a>
        </section>
      </main>
    );
  }

  // Password changes are permitted only when required.
  if (!session.passwordChangeRequired) {
    redirect('/order-queue');
  }

  return <PasswordChangeForm username={session.username} />;
}
