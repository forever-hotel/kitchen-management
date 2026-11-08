'use client';

import { Alert, Button, Form, Input } from 'antd';
import { useState } from 'react';

// Reuse the approved DDP-235 login design without changing the login page.
import styles from '../login/login.module.css';

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordChangeResponse {
  error?: string;
  status?: string;
  session?: {
    passwordChangeRequired?: boolean;
  };
}

interface PasswordChangeFormProps {
  username: string;
}

export default function PasswordChangeForm({ username }: PasswordChangeFormProps) {
  const [form] = Form.useForm<PasswordFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: PasswordFormValues): Promise<void> {
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      let body: PasswordChangeResponse | null = null;

      try {
        body = (await response.json()) as PasswordChangeResponse;
      } catch {
        body = null;
      }

      if (!response.ok) {
        setError(
          typeof body?.error === 'string'
            ? body.error
            : 'Unable to change password. Please try again.',
        );
        return;
      }

      if (body?.status !== 'password_changed' || body.session?.passwordChangeRequired !== false) {
        setError('The password change could not be confirmed.');
        return;
      }

      // The server has replaced the encrypted session
      // cookie. Reload into the authenticated workspace.
      window.location.replace('/order-queue');
    } catch {
      setError('Unable to connect to the authentication service.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="change-password-heading">
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
          <h1 id="change-password-heading" className={styles.heading}>
            Change Temporary Password
          </h1>
          <p className={styles.description}>
            Welcome, {username}. Set a new password to access Kitchen Management.
          </p>
        </div>

        {error && (
          <Alert type="error" title={error} showIcon role="alert" className={styles.alert} />
        )}

        <Form<PasswordFormValues>
          className={styles.form}
          form={form}
          name="kms-first-login-password"
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
        >
          <Form.Item
            className={styles.field}
            name="currentPassword"
            label="Current Password"
            rules={[
              {
                required: true,
                message: 'Enter your current password',
              },
            ]}
          >
            <Input.Password
              className={styles.input}
              size="middle"
              autoComplete="current-password"
              maxLength={1024}
              disabled={submitting}
            />
          </Form.Item>

          <Form.Item
            className={styles.field}
            name="newPassword"
            label="New Password"
            dependencies={['currentPassword']}
            rules={[
              {
                required: true,
                message: 'Enter a new password',
              },
              {
                min: 12,
                message: 'Use at least 12 characters',
              },
              {
                validator: async (_, value: string | undefined) => {
                  if (value && value === form.getFieldValue('currentPassword')) {
                    throw new Error('New password must differ from current password');
                  }
                },
              },
            ]}
          >
            <Input.Password
              className={styles.input}
              size="middle"
              autoComplete="new-password"
              maxLength={1024}
              disabled={submitting}
            />
          </Form.Item>

          <Form.Item
            className={styles.field}
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            rules={[
              {
                required: true,
                message: 'Confirm your new password',
              },
              ({ getFieldValue }) => ({
                validator(_, value: string | undefined) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              className={styles.input}
              size="middle"
              autoComplete="new-password"
              maxLength={1024}
              disabled={submitting}
            />
          </Form.Item>

          <Form.Item className={styles.submitField}>
            <Button
              className={styles.submitButton}
              type="primary"
              htmlType="submit"
              size="middle"
              loading={submitting}
              block
            >
              Update Password
            </Button>
          </Form.Item>
        </Form>

        <p className={styles.helpText}>
          This step is required only for temporary or reset passwords.
        </p>
      </section>

      <p className={styles.pageFooter}>Forever Hotel · Authorized staff access</p>
    </main>
  );
}
