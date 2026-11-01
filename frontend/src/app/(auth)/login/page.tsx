'use client';

import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';

interface LoginFormValues {
  username: string;
  password: string;
}

interface LoginResponse {
  error?: string;
  nextPath?: string;
}

const ALLOWED_DESTINATIONS = ['/order-queue', '/change-password'] as const;

function isAllowedDestination(path: unknown): path is (typeof ALLOWED_DESTINATIONS)[number] {
  return typeof path === 'string' && ALLOWED_DESTINATIONS.some((allowed) => allowed === path);
}

export default function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(values: LoginFormValues): Promise<void> {
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          username: values.username.trim(),
          password: values.password,
        }),
      });

      let body: LoginResponse | null = null;

      try {
        body = (await response.json()) as LoginResponse;
      } catch {
        body = null;
      }

      if (!response.ok) {
        setError(
          typeof body?.error === 'string' ? body.error : 'Unable to sign in. Please try again.',
        );
        return;
      }

      if (!isAllowedDestination(body?.nextPath)) {
        setError('Unable to complete sign-in. Please try again.');
        return;
      }

      // Full navigation ensures the next page receives
      // the newly issued HttpOnly session cookie.
      window.location.replace(body.nextPath);
    } catch {
      setError('Unable to connect to the authentication service.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <section className="w-full max-w-md" aria-labelledby="login-heading">
        <div
          className="mb-6 rounded-xl p-6 text-center"
          style={{
            background: 'var(--kms-header)',
            color: 'var(--kms-header-foreground)',
          }}
        >
          <Typography.Title
            level={1}
            style={{
              color: 'inherit',
              marginBottom: 4,
            }}
          >
            Forever Hotel
          </Typography.Title>

          <Typography.Text style={{ color: 'inherit' }}>Kitchen Operations</Typography.Text>
        </div>

        <Card
          style={{
            borderColor: 'var(--kms-border)',
          }}
        >
          <Typography.Title id="login-heading" level={2}>
            Kitchen Management Login
          </Typography.Title>

          <Typography.Paragraph type="secondary">
            Sign in with your authorized kitchen staff account.
          </Typography.Paragraph>

          {error && <Alert type="error" title={error} showIcon role="alert" className="mb-5" />}

          <Form<LoginFormValues>
            name="kms-staff-login"
            layout="vertical"
            requiredMark={false}
            onFinish={handleSignIn}
            autoComplete="on"
          >
            <Form.Item
              name="username"
              label="Username"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: 'Enter your username',
                },
              ]}
            >
              <Input
                size="large"
                placeholder="Enter username"
                autoComplete="username"
                maxLength={100}
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                {
                  required: true,
                  message: 'Enter your password',
                },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
                Sign in
              </Button>
            </Form.Item>
          </Form>

          <Typography.Paragraph type="secondary" className="mt-5 mb-0 text-center">
            First-time users may be required to change their temporary password.
          </Typography.Paragraph>
        </Card>
      </section>
    </main>
  );
}
