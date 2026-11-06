'use client';

import { Alert, Button, Form, Input } from 'antd';
import { useState } from 'react';

import styles from './login.module.css';

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
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-heading">
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            FH
          </div>
          <div className={styles.brandCopy}>
            <p className={styles.brandName}>Forever Hotel</p>
            <p className={styles.brandCaption}>Kitchen Operations</p>
          </div>
          <span className={styles.staffLabel}>STAFF PORTAL</span>
        </div>

        <div className={styles.intro}>
          <h1 id="login-heading" className={styles.heading}>
            Kitchen Management Login
          </h1>
          <p className={styles.description}>Welcome back. Sign in to your workspace.</p>
        </div>

        {error && (
          <Alert type="error" title={error} showIcon role="alert" className={styles.alert} />
        )}

        <Form<LoginFormValues>
          className={styles.form}
          name="kms-staff-login"
          layout="vertical"
          requiredMark={false}
          onFinish={handleSignIn}
          autoComplete="on"
        >
          <Form.Item
            className={styles.field}
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
              className={styles.input}
              size="middle"
              placeholder="Enter username"
              autoComplete="username"
              maxLength={100}
              disabled={submitting}
            />
          </Form.Item>

          <Form.Item
            className={styles.field}
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
              className={styles.input}
              size="middle"
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={submitting}
            />
          </Form.Item>

          <Form.Item className={styles.submitField}>
            <Button
              className={styles.submitButton}
              type="primary"
              htmlType="submit"
              size="middle"
              block
              loading={submitting}
            >
              Sign in
            </Button>
          </Form.Item>
        </Form>

        <p className={styles.helpText}>
          First-time staff may need to change their temporary password.
        </p>
      </section>

      <p className={styles.pageFooter}>Forever Hotel · Authorized staff access</p>
    </main>
  );
}
