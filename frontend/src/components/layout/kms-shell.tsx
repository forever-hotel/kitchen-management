'use client';

import { Layout } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { KmsCurrentTime } from './kms-current-time';
import styles from './kms-header.module.css';
import {
  getKmsNavigationItems,
  type KmsRole,
} from './kms-navigation';

const { Content, Footer } = Layout;

interface KmsShellProps extends PropsWithChildren {
  role?: KmsRole | null;
  /**
   * Local UI preview only.
   * Never grants authentication or authorization.
   */
  previewNavigation?: boolean;
}

export function KmsShell({
  children,
  role = null,
  previewNavigation = false,
}: KmsShellProps) {
  const pathname = usePathname();

  const allowPreview =
    previewNavigation &&
    process.env.NODE_ENV !== 'production';

  const navigationRole =
    role ?? (allowPreview ? 'KITCHEN_MANAGER' : null);

  const navigationItems =
    getKmsNavigationItems(navigationRole);

  return (
    <Layout className="kms-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className={styles.header}>
        <div className={styles.brand}>
          <span
            className={styles.brandDot}
            aria-hidden="true"
          />
          <span className={styles.brandName}>
            FOREVER · KMS
          </span>
          <h1 className={styles.visuallyHidden}>
            Kitchen Management System
          </h1>
        </div>

        {navigationItems.length > 0 && (
          <nav
            aria-label="Kitchen navigation"
            className={styles.navigation}
          >
            {navigationItems.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={
                    active ? 'page' : undefined
                  }
                  className={`${styles.navLink}${
                    active
                      ? ` ${styles.navLinkActive}`
                      : ''
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <KmsCurrentTime />
      </header>

      <Content
        id="main-content"
        className="kms-shell__content"
        tabIndex={-1}
      >
        <div className="kms-shell__main">
          {children}
        </div>
      </Content>

      <Footer className="kms-shell__footer">
        Forever Hotel Kitchen Operations
      </Footer>
    </Layout>
  );
}
