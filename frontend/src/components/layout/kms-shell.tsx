'use client';

import { Layout, Space, Typography } from 'antd';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';

import { getKmsNavigationItems, type KmsRole } from './kms-navigation';
import { KmsLogoutButton } from '@/components/layout/kms-logout-button';

const { Header, Content, Footer } = Layout;

interface KmsShellProps extends PropsWithChildren {
  role?: KmsRole | null;
  /** Development-only links to fixture screens; never grants manager authorization. */
  previewNavigation?: boolean;
}

const previewRoutes = [
  { href: '/menu-management', label: 'Menu Management' },
  { href: '/time-windows', label: 'Time Windows' },
] as const;

/**
 * Shared application shell. Real navigation remains role-based, and production
 * authorization is independent of the development-only preview navigation.
 */
export function KmsShell({ children, role = null, previewNavigation = false }: KmsShellProps) {
  const navigationItems = getKmsNavigationItems(role);
  const showPreviewNavigation = previewNavigation && process.env.NODE_ENV !== 'production';

  return (
    <Layout className="kms-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Header className="kms-shell__header">
        <div className="kms-shell__brand">
          <Typography.Text className="kms-shell__hotel">
            FOREVER <span className="kms-shell__accent">· KMS</span>
          </Typography.Text>

          <Typography.Title level={1} className="kms-shell__title">
            Kitchen Management System
          </Typography.Title>
        </div>

        {navigationItems.length > 0 ? (
          <nav aria-label="Kitchen navigation" className="kms-shell__nav">
            <Space size="middle" wrap>
              {navigationItems.map((item) => (
                <Link key={item.key} href={item.href} className="kms-shell__nav-link">
                  {item.label}
                </Link>
              ))}
              {role && <span className="kms-shell__role">{role.replace(/_/g, ' ')}</span>}
              <KmsLogoutButton />
            </Space>
          </nav>
        ) : showPreviewNavigation ? (
          <nav aria-label="Local UI preview navigation" className="kms-shell__nav">
            <Space size="middle" wrap>
              <span className="kms-shell__preview-label">LOCAL UI PREVIEW</span>
              {previewRoutes.map((item) => (
                <Link key={item.href} href={item.href} className="kms-shell__nav-link">
                  {item.label}
                </Link>
              ))}
            </Space>
          </nav>
        ) : null}
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
