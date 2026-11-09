'use client';

import { Layout } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PropsWithChildren } from 'react';

import { KmsFooter } from './kms-footer';
import { KmsLogoutButton } from './kms-logout-button';
import { KmsCurrentTime } from './kms-current-time';
import styles from './kms-header.module.css';
import { getKmsNavigationItems, type KmsRole } from './kms-navigation';

const { Content } = Layout;

interface KmsShellProps extends PropsWithChildren {
  role?: KmsRole | null;
}

/**
 * Preserve role-validated navigation and avoid duplicating the shared footer.
 * Menu Management has its own two-column workspace, so its footer is rendered
 * inside the right panel. Every other protected screen uses the shell footer.
 */
export function KmsShell({ children, role = null }: KmsShellProps) {
  const pathname = usePathname();
  const navigationItems = getKmsNavigationItems(role);
  const hasInnerFooter = pathname === '/menu-management';

  return (
    <Layout className={`kms-shell${hasInnerFooter ? ' kms-shell--menu-management' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandDot} aria-hidden="true" />
          <span className={styles.brandName}>FOREVER · KMS</span>
          <h1 className={styles.visuallyHidden}>Kitchen Management System</h1>
        </div>

        {navigationItems.length > 0 && (
          <nav aria-label="Kitchen navigation" className={styles.navigation}>
            {navigationItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`${styles.navLink}${active ? ` ${styles.navLinkActive}` : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div
          className={styles.headerUtilities}
          role="group"
          aria-label="Hotel time and account actions"
        >
          <KmsCurrentTime />
          {navigationItems.length > 0 ? (
            <div className={styles.logoutSlot}>
              <KmsLogoutButton />
            </div>
          ) : null}
        </div>
      </header>

      <Content id="main-content" className="kms-shell__content" tabIndex={-1}>
        <div className="kms-shell__main">{children}</div>
      </Content>

      {!hasInnerFooter && <KmsFooter className="kms-shell__footer" />}
    </Layout>
  );
}
