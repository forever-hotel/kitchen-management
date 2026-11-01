'use client';

import { Layout, Space, Typography } from 'antd';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';

import { getKmsNavigationItems, type KmsRole } from './kms-navigation';
import { KmsLogoutButton } from '@/components/layout/kms-logout-button';

const { Header, Content, Footer } = Layout;

interface KmsShellProps extends PropsWithChildren {
  role?: KmsRole | null;
}

/**
 * Shared application shell for the KMS.
 *
 * Navigation is based on the authenticated user's role.
 * The real session will be connected in DDP-235.
 *
 * Navigation visibility is not a replacement for
 * server-side authorization.
 */
export function KmsShell({ children, role = null }: KmsShellProps) {
  const navigationItems = getKmsNavigationItems(role);

  return (
    <Layout className="kms-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Header className="kms-shell__header">
        <div className="kms-shell__brand">
          <Typography.Text className="kms-shell__hotel">Forever Hotel</Typography.Text>

          <Typography.Title level={1} className="kms-shell__title">
            Kitchen Management System
          </Typography.Title>
        </div>

        {navigationItems.length > 0 && (
          <nav aria-label="Kitchen navigation" className="kms-shell__nav">
            <Space size="middle" wrap>
              {navigationItems.map((item) => (
                <Link key={item.key} href={item.href} className="kms-shell__nav-link">
                  {item.label}
                </Link>
              ))}
              <KmsLogoutButton />
            </Space>
          </nav>
        )}
      </Header>

      <Content id="main-content" className="kms-shell__content" tabIndex={-1}>
        <div className="kms-shell__main">{children}</div>
      </Content>

      <Footer className="kms-shell__footer">
        <Typography.Text>Forever Hotel Kitchen Operations</Typography.Text>
      </Footer>
    </Layout>
  );
}
