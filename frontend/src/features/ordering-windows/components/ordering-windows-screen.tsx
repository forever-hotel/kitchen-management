'use client';

import { Alert, Button, Switch, Typography } from 'antd';
import {
  AppstoreOutlined,
  CoffeeOutlined,
  FireOutlined,
  ReloadOutlined,
  RightOutlined,
  SunOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import type { KmsMealCategoryData, KmsOrderingWindowData } from '@/types/kms-menu';

import {
  buildWindowPatch,
  displayTime,
  hotelTime,
  type OrderingWindowPatch,
  windowState,
  windowUpdateError,
} from '../utils/ordering-window.util';
import styles from './ordering-windows-screen.module.css';

export interface OrderingWindowsScreenProps {
  windows: readonly KmsOrderingWindowData[];
  categories?: readonly KmsMealCategoryData[];
  /** Highlight the category chosen with Edit Window in Menu Management. */
  selectedCategoryId?: string;
  /** A live loading error, never replaced by fixture records. */
  loadError?: string;
  onRetry?: () => Promise<void>;
  /** The hosting authenticated manager BFF is responsible for its own role enforcement. */
  onUpdateWindow?: (categoryId: string, patch: OrderingWindowPatch) => Promise<unknown>;
  onReloadWindows?: () => Promise<readonly KmsOrderingWindowData[]>;
  /** Only API data with both connected callbacks can enable saving. */
  dataMode?: 'fixtures' | 'api';
  /** Optional deterministic clock for tests; otherwise updated while the screen is mounted. */
  now?: Date;
}

interface WindowRow {
  category: string;
  window: KmsOrderingWindowData;
}

interface TimelineEntry {
  key: string;
  kind: 'gap' | 'window';
  time: string;
  label: string;
  open?: boolean;
}

const categoryOrder = ['breakfast', 'lunch', 'tea-time', 'dinner'];
const categoryIcons: Record<string, ReactNode> = {
  breakfast: <SunOutlined />,
  lunch: <SunOutlined />,
  'tea-time': <CoffeeOutlined />,
  dinner: <FireOutlined />,
};

function clockLabel(now: Date): string {
  return displayTime(hotelTime(now));
}

function WindowCard({
  row,
  now,
  selected,
  editable,
  onSave,
  onRetryReload,
}: {
  row: WindowRow;
  now: Date;
  selected: boolean;
  editable: boolean;
  onSave: (id: string, patch: OrderingWindowPatch) => Promise<boolean>;
  onRetryReload: () => Promise<void>;
}) {
  const { window, category } = row;
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!selected) return;
    cardRef.current?.focus({ preventScroll: true });
    cardRef.current?.scrollIntoView?.({ block: 'center' });
  }, [selected]);
  const [start, setStart] = useState(window.orderStartTime.slice(0, 5));
  const [cutoff, setCutoff] = useState(window.orderCutoffTime.slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [reloadPending, setReloadPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDirty =
    start !== window.orderStartTime.slice(0, 5) || cutoff !== window.orderCutoffTime.slice(0, 5);
  const state = windowState(window, now);
  const statusText =
    state === 'OPEN'
      ? 'Live now'
      : state === 'UPCOMING'
        ? `Opens at ${displayTime(window.orderStartTime)}`
        : 'Closed';
  const cardId = `window-${window.categoryId}`;
  const icon = categoryIcons[category.toLowerCase()] ?? <AppstoreOutlined />;
  const update = async () => {
    if (!editable || saving || reloadPending) return;
    const { patch, error: validationError } = buildWindowPatch(window, start, cutoff);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (Object.keys(patch).length === 0) {
      setError('No changes to save.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const verified = await onSave(window.categoryId, patch);
      if (!verified) {
        setReloadPending(true);
        setError('Changes were saved, but the list could not be refreshed. Retry refresh.');
      }
    } catch (failure) {
      setError(windowUpdateError(failure));
    } finally {
      setSaving(false);
    }
  };
  const retry = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onRetryReload();
      setError(null);
      setReloadPending(false);
    } catch {
      setError('Still unable to reload saved windows. Check the connection and retry.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <article
      ref={cardRef}
      aria-label={`${category} ordering window`}
      tabIndex={selected ? -1 : undefined}
      className={`${styles.card} ${state === 'OPEN' ? styles.activeCard : ''} ${selected ? styles.selectedCard : ''}`}
    >
      <div className={styles.cardHeader}>
        <div className={styles.mealTitle}>
          <span aria-hidden="true" className={styles.mealIcon}>
            {icon}
          </span>
          <div>
            <h3>{category}</h3>
            <p>Ordering window · Asia/Colombo</p>
            {selected && (
              <span className={styles.selectedCategoryNotice}>Selected from Menu Management</span>
            )}
          </div>
        </div>
        <span className={`${styles.status} ${styles[`status${state}`]}`}>
          <span aria-hidden="true" className={styles.statusDot} />
          {statusText}
        </span>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor={`${cardId}-start`}>Start time</label>
          <input
            id={`${cardId}-start`}
            aria-label={`${category} start time`}
            type="time"
            step={60}
            value={start}
            onChange={(event) => {
              setStart(event.target.value);
              setError(null);
            }}
            disabled={saving || reloadPending}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${cardId}-cutoff`}>Cutoff time</label>
          <input
            id={`${cardId}-cutoff`}
            aria-label={`${category} cutoff time`}
            type="time"
            step={60}
            value={cutoff}
            onChange={(event) => {
              setCutoff(event.target.value);
              setError(null);
            }}
            disabled={saving || reloadPending}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${cardId}-last-order`}>Last order (soft)</label>
          <input
            id={`${cardId}-last-order`}
            aria-label={`${category} last order time`}
            type="time"
            disabled
          />
        </div>
      </div>
      <div className={styles.toggleRow}>
        <Switch
          size="small"
          checked
          disabled
          aria-label={`${category} ordering window enabled`}
          className={styles.toggle}
        />
        <span>Ordering window enabled</span>
      </div>
      <p className={styles.rule}>
        Open at start · closed at cutoff. Last order (soft) and the enabled switch are not yet
        supported.
      </p>
      {state === 'OPEN' && (
        <Alert
          type="info"
          showIcon
          role="note"
          className={styles.activeInfo}
          title={
            <>
              This window is currently <strong>open</strong>. Guests can order until{' '}
              {displayTime(window.orderCutoffTime)}.
            </>
          }
        />
      )}
      {error && (
        <div role="alert" className={styles.errorMessage}>
          {error}
        </div>
      )}
      {!editable && (
        <p className={styles.previewOnly}>
          Preview only — authenticated save and refresh are not connected.
        </p>
      )}
      <div className={styles.actions}>
        {reloadPending ? (
          <Button
            type="primary"
            icon={<ReloadOutlined aria-hidden="true" />}
            loading={saving}
            disabled={saving}
            onClick={() => void retry()}
          >
            Retry refresh
          </Button>
        ) : (
          <Button
            type="primary"
            loading={saving}
            disabled={!editable || saving || !isDirty}
            onClick={() => void update()}
          >
            Save Changes
          </Button>
        )}
        <Button
          disabled={saving || reloadPending || !isDirty}
          onClick={() => {
            setStart(window.orderStartTime.slice(0, 5));
            setCutoff(window.orderCutoffTime.slice(0, 5));
            setError(null);
          }}
        >
          Reset to Saved
        </Button>
      </div>
    </article>
  );
}

/** R-12 Figma-aligned manager UI. No invented persistence or browser-only authorization. */
export function OrderingWindowsScreen({
  windows,
  categories,
  selectedCategoryId,
  loadError,
  onRetry,
  onUpdateWindow,
  onReloadWindows,
  dataMode = 'fixtures',
  now,
}: OrderingWindowsScreenProps) {
  const [liveClock, setLiveClock] = useState(() => new Date());
  const [reloaded, setReloaded] = useState<{
    source: readonly KmsOrderingWindowData[];
    values: readonly KmsOrderingWindowData[];
  } | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (now) return;
    const id = setInterval(() => setLiveClock(new Date()), 15000);
    return () => clearInterval(id);
  }, [now]);

  const clock = now ?? liveClock;
  const currentWindows = reloaded?.source === windows ? reloaded.values : windows;
  const editable = dataMode === 'api' && !loadError && Boolean(onUpdateWindow && onReloadWindows);
  const rows: WindowRow[] = currentWindows.map((window, index) => ({
    window,
    category:
      ('name' in window && typeof window.name === 'string' && window.name.trim()
        ? window.name
        : categories?.find((category) => category.categoryId === window.categoryId)?.name) ??
      `Meal category ${index + 1}`,
  }));
  rows.sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category.toLowerCase());
    const bi = categoryOrder.indexOf(b.category.toLowerCase());
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  // Closed gaps are derived from the saved windows for display only; nothing is persisted.
  const timeline: TimelineEntry[] = [];
  const byStart = [...rows].sort((a, b) =>
    a.window.orderStartTime.localeCompare(b.window.orderStartTime),
  );
  byStart.forEach(({ window, category }, index) => {
    const previous = byStart[index - 1]?.window;
    if (!previous) {
      timeline.push({
        key: `before-${window.categoryId}`,
        kind: 'gap',
        time: '00:00',
        label: `Before ${category}`,
      });
    } else if (window.orderStartTime > previous.orderCutoffTime) {
      timeline.push({
        key: `gap-${window.categoryId}`,
        kind: 'gap',
        time: previous.orderCutoffTime.slice(0, 5),
        label: 'Gap (closed)',
      });
    }
    timeline.push({
      key: window.categoryId,
      kind: 'window',
      time: window.orderStartTime.slice(0, 5),
      label: windowState(window, clock) === 'OPEN' ? `${category} ← NOW` : category,
      open: windowState(window, clock) === 'OPEN',
    });
  });
  const lastWindow = byStart[byStart.length - 1]?.window;
  if (lastWindow) {
    timeline.push({
      key: 'closed-for-the-day',
      kind: 'gap',
      time: lastWindow.orderCutoffTime.slice(0, 5),
      label: 'Closed for the day',
    });
  }

  const refreshFromServer = async () => {
    if (!onReloadWindows) throw new Error('Manager window reload is not connected');
    const fresh = await onReloadWindows();
    if (!Array.isArray(fresh)) throw new Error('Invalid manager window response');
    setReloaded({ source: windows, values: fresh });
    setRefreshError(null);
  };
  const save = async (categoryId: string, patch: OrderingWindowPatch): Promise<boolean> => {
    if (!editable || !onUpdateWindow) throw new Error('Manager window update is not connected');
    setSavedNotice(null);
    await onUpdateWindow(categoryId, patch);
    try {
      if (!onReloadWindows) throw new Error('Reload unavailable');
      const fresh = await onReloadWindows();
      const updated = fresh.find((window) => window.categoryId === categoryId);
      if (
        !updated ||
        (patch.orderStartTime !== undefined && updated.orderStartTime !== patch.orderStartTime) ||
        (patch.orderCutoffTime !== undefined && updated.orderCutoffTime !== patch.orderCutoffTime)
      ) {
        throw new Error('Saved window is not yet reflected in the reload');
      }
      setReloaded({ source: windows, values: fresh });
      setRefreshError(null);
      setSavedNotice('Ordering window saved and refreshed from the server.');
      return true;
    } catch {
      return false;
    }
  };
  const refresh = async () => {
    if (refreshing || !editable) return;
    setRefreshing(true);
    setRefreshError(null);
    try {
      await refreshFromServer();
    } catch {
      setRefreshError('Could not refresh the ordering windows. Try again.');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section aria-labelledby="time-windows-heading" className={styles.workspace}>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <Link href="/menu-management">Menu Management</Link>
        <span aria-hidden="true">
          <RightOutlined />
        </span>
        <span>Ordering Time Window Settings</span>
      </nav>
      <div className={styles.pageGrid}>
        <div className={styles.leftColumn}>
          <header className={styles.heading}>
            <div>
              <Typography.Title level={2} id="time-windows-heading" className={styles.title}>
                Ordering Time Windows
              </Typography.Title>
              <Typography.Paragraph className={styles.description}>
                Configure when guests can place orders for each meal category. Current hotel time:{' '}
                <strong>{clockLabel(clock)}</strong>
              </Typography.Paragraph>
            </div>
            <div className={styles.headerControls}>
              <span className={styles.policyChip}>Asia/Colombo · saved cutoff is final</span>
              <Button
                icon={<ReloadOutlined aria-hidden="true" />}
                disabled={!editable || refreshing}
                loading={refreshing}
                onClick={() => void refresh()}
              >
                Refresh windows
              </Button>
            </div>
          </header>
          {dataMode === 'fixtures' && (
            <Alert
              type="info"
              title="Feature scaffold"
              description="Sample time windows only. No hotel records loaded; saving requires an authenticated manager API."
              showIcon
            />
          )}
          {savedNotice && (
            <Alert
              type="success"
              showIcon
              title={savedNotice}
              closable
              onClose={() => setSavedNotice(null)}
            />
          )}
          {refreshError && <Alert type="error" showIcon title={refreshError} />}
          {loadError && (
            <Alert
              type="error"
              showIcon
              title="Ordering windows could not be loaded"
              description={loadError}
              action={onRetry ? <Button onClick={() => void onRetry()}>Retry</Button> : undefined}
            />
          )}
          <p className={styles.count}>Ordering windows: {rows.length}.</p>
          <div className={styles.cards}>
            {rows.map((row) => (
              <WindowCard
                key={`${row.window.categoryId}:${row.window.orderStartTime}:${row.window.orderCutoffTime}`}
                row={row}
                now={clock}
                selected={selectedCategoryId === row.window.categoryId}
                editable={editable}
                onSave={save}
                onRetryReload={refreshFromServer}
              />
            ))}
          </div>
          {rows.length === 0 && !loadError && (
            <Alert
              type="warning"
              title="No ordering windows available"
              description="Refresh the data or contact the Kitchen Manager."
            />
          )}
        </div>
        <aside className={styles.rightColumn} aria-label="Ordering-window guidance">
          <section
            className={`${styles.sidePanel} ${styles.timelinePanel}`}
            aria-labelledby="timeline-heading"
          >
            <h3 id="timeline-heading">Today’s timeline</h3>
            <ol className={styles.timeline}>
              {timeline.map((entry) => (
                <li key={entry.key} className={styles.timelineRow}>
                  <span className={styles.timelineTime}>{entry.time}</span>
                  <span
                    className={`${styles.timelineBar} ${
                      entry.kind === 'gap'
                        ? styles.timelineGap
                        : entry.open
                          ? styles.timelineActive
                          : ''
                    }`}
                  >
                    {entry.label}
                  </span>
                </li>
              ))}
            </ol>
            <p className={styles.timelineNote}>
              Starts are inclusive; cutoffs are exclusive. Times are hotel-local.
            </p>
          </section>
          <section
            className={`${styles.sidePanel} ${styles.helpPanel}`}
            aria-labelledby="window-help-heading"
          >
            <h3 id="window-help-heading">How windows work</h3>
            <p>
              The FOSS backend must check the latest saved window when an order is submitted.
              Viewing the menu is not authorization to place an order after cutoff.
            </p>
          </section>
          <section
            className={`${styles.sidePanel} ${styles.policyPanel}`}
            aria-labelledby="schema-heading"
          >
            <h3 id="schema-heading">Supported settings</h3>
            <p>
              Only start and cutoff times are persisted. An enabled switch, soft last-order time and
              all-day mode are not yet approved database features.
            </p>
            <p>
              Cross-category overlap rules and live FOSS enforcement remain separate integration
              decisions.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
