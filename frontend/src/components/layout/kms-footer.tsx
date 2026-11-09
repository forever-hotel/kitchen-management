'use client';

import { ArrowUpOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, type PropsWithChildren } from 'react';

import { getKmsNavigationItems, type KmsRole } from './kms-navigation';
import styles from './kms-footer.module.css';

const KmsFooterRoleContext = createContext<KmsRole | null>(null);

/** Keep footer shortcuts in sync with the role-validated shared workspace. */
export function KmsFooterRoleProvider({
  role,
  children,
}: PropsWithChildren<{ role: KmsRole | null }>) {
  return <KmsFooterRoleContext.Provider value={role}>{children}</KmsFooterRoleContext.Provider>;
}

interface KmsFooterProps {
  className?: string;
}

/** Shared footer, rendered once per page: inside Menu Management's right panel or below other workspaces. */
export function KmsFooter({ className = '' }: KmsFooterProps) {
  const role = useContext(KmsFooterRoleContext);
  const pathname = usePathname();
  const shortcuts = getKmsNavigationItems(role);

  const scrollToTop = () => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <footer role="contentinfo" className={`${styles.footer}${className ? ` ${className}` : ''}`}>
      <div className={styles.branding}>
        <span className={styles.brandName}>FOREVER · KMS</span>
        <span className={styles.subtitle}>Forever Hotel Kitchen Operations</span>
        <small className={styles.copyright}>
          © {new Date().getFullYear()} Forever Hotel. All rights reserved.
        </small>
      </div>

      {shortcuts.length > 0 && (
        <nav aria-label="Kitchen footer shortcuts" className={styles.shortcuts}>
          {shortcuts.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={
                pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'page' : undefined
              }
              className={styles.shortcut}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      <button type="button" className={styles.backToTop} onClick={scrollToTop}>
        <ArrowUpOutlined aria-hidden="true" />
        Back to top
      </button>
    </footer>
  );
}
