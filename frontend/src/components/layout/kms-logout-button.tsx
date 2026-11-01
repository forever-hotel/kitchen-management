'use client';

import { Button } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LogoutResponse {
  status?: string;
  error?: string;
}

export function KmsLogoutButton() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout(): Promise<void> {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      });

      let body: LogoutResponse | null = null;

      try {
        body = (await response.json()) as LogoutResponse;
      } catch {
        body = null;
      }

      if (!response.ok) {
        setError(
          typeof body?.error === 'string' ? body.error : 'Unable to sign out. Please try again.',
        );
        return;
      }

      if (body?.status !== 'signed_out') {
        setError('Logout could not be confirmed.');
        return;
      }

      router.replace('/login');
    } catch {
      setError('Unable to contact the logout service. Please retry.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        htmlType="button"
        loading={submitting}
        disabled={submitting}
        onClick={() => void handleLogout()}
        style={{
          background: 'transparent',
          color: 'var(--kms-header-foreground)',
          borderColor: 'var(--kms-header-foreground)',
          minHeight: 44,
        }}
      >
        Sign out
      </Button>

      {error && (
        <span
          role="alert"
          style={{
            color: 'var(--kms-header-foreground)',
            fontSize: 12,
          }}
        >
          {error}
        </span>
      )}
    </>
  );
}
