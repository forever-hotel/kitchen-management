'use client';

import { Alert, Typography } from 'antd';

import type { KmsMealCategoryData, KmsOrderingWindowData } from '@/types/kms-menu';

import styles from './ordering-windows-screen.module.css';

interface OrderingWindowsScreenProps {
  windows: readonly KmsOrderingWindowData[];
  /** Optional display names; window persistence remains on meal categories. */
  categories?: readonly KmsMealCategoryData[];
}

function displayTime(value: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/** Read-only feature scaffold; times here are samples until the manager BFF is wired. */
export function OrderingWindowsScreen({ windows, categories }: OrderingWindowsScreenProps) {
  return (
    <section aria-labelledby="time-windows-heading" className={styles.workspace}>
      <header className={styles.heading}>
        <Typography.Title level={2} id="time-windows-heading" className={styles.title}>
          Ordering Time Windows
        </Typography.Title>
        <Typography.Paragraph className={styles.description}>
          Review the ordering start and cutoff times configured for each meal period.
        </Typography.Paragraph>
      </header>

      <Alert
        type="info"
        title="Feature scaffold"
        description="Local UI preview — sample ordering windows only. No live records were loaded and no updates can be saved."
        showIcon
      />

      <Typography.Paragraph className={styles.count}>
        Ordering windows: {windows.length}.
      </Typography.Paragraph>

      <div className={styles.cards}>
        {windows.map((window, index) => {
          const name =
            categories?.find((category) => category.categoryId === window.categoryId)?.name ??
            `Meal category ${index + 1}`;
          return (
            <article key={window.categoryId} className={styles.card} aria-label={`${name} window`}>
              <div className={styles.cardHeader}>
                <h3>{name}</h3>
                <span className={styles.sampleTag}>Sample</span>
              </div>
              <dl className={styles.times}>
                <div>
                  <dt>Order start</dt>
                  <dd>{displayTime(window.orderStartTime)}</dd>
                </div>
                <div>
                  <dt>Order cutoff</dt>
                  <dd>{displayTime(window.orderCutoffTime)}</dd>
                </div>
              </dl>
              <p className={styles.note}>Editing requires the authenticated manager integration.</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
