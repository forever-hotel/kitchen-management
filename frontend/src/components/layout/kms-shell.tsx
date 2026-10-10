'use client';

import { Layout, Typography } from 'antd';
import type { PropsWithChildren } from 'react';

const { Header, Content, Footer } = Layout;

/*
 * Shared application shell for KMS.
 *
 * Feature-specific navigation, authentication state and business behaviour
 * are intentionally excluded from this foundation issue.
 */
export function KmsShell({ children }: PropsWithChildren) {
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
