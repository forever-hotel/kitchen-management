'use client';

import { ArrowUpOutlined } from '@ant-design/icons';

import styles from './kms-footer.module.css';

interface KmsFooterProps {
  className?: string;
}

/** Shared KMS footer: in Menu Management's right column, or below other workspaces. */
export function KmsFooter({ className = '' }: KmsFooterProps) {
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

      <button type="button" className={styles.backToTop} onClick={scrollToTop}>
        <ArrowUpOutlined aria-hidden="true" />
        Back to top
      </button>
    </footer>
  );
}
