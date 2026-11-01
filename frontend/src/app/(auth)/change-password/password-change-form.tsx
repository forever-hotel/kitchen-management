'use client';

import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useState } from 'react';

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
    <main className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <section className="w-full max-w-md">
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

          <Typography.Text style={{ color: 'inherit' }}>Kitchen Management</Typography.Text>
        </div>

        <Card
          style={{
            borderColor: 'var(--kms-border)',
          }}
        >
          <Typography.Title level={2}>Change Temporary Password</Typography.Title>

          <Typography.Paragraph type="secondary">
            Welcome, {username}. You must change your temporary password before accessing Kitchen
            Management.
          </Typography.Paragraph>

          {error && <Alert type="error" title={error} showIcon role="alert" className="mb-5" />}

          <Form<PasswordFormValues>
            form={form}
            name="kms-first-login-password"
            layout="vertical"
            requiredMark={false}
            onFinish={handleSubmit}
          >
            <Form.Item
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
                size="large"
                autoComplete="current-password"
                maxLength={1024}
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item
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
                size="large"
                autoComplete="new-password"
                maxLength={1024}
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item
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
                size="large"
                autoComplete="new-password"
                maxLength={1024}
                disabled={submitting}
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" size="large" loading={submitting} block>
                Update Password
              </Button>
            </Form.Item>
          </Form>

          <Typography.Paragraph type="secondary" className="mt-5 mb-0 text-center">
            This step is required only when your account has a temporary password or has been reset
            by hotel management.
          </Typography.Paragraph>
        </Card>
      </section>
    </main>
  );
}
