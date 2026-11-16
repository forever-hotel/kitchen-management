'use client';

import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, Modal, Tag } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { parseKitchenOrderDetails, type KitchenOrderDetails } from '../api/order-details.contract';
import { getQueueOrderAgeMinutes } from '../lib/order-queue.utils';
import { QueueRefreshCoordinator, getQueueRefreshIntervalMs } from '../lib/order-queue-sync';
import type { KmsQueueStatus } from '../types/order-queue.types';
import styles from './order-queue-board.module.css';
import live from './live-order-queue-screen.module.css';

const STATUSES: readonly KmsQueueStatus[] = ['PLACED', 'IN_PREPARATION', 'READY'];
const LABELS: Record<KmsQueueStatus, string> = {
  PLACED: 'New Orders',
  IN_PREPARATION: 'In Preparation',
  READY: 'Ready for Delivery',
};
const COLUMN_STYLES: Record<KmsQueueStatus, string> = {
  PLACED: styles.laneNew,
  IN_PREPARATION: styles.lanePreparing,
  READY: styles.laneReady,
};
const clock = new Intl.DateTimeFormat('en-LK', {
  timeZone: 'Asia/Colombo',
  hour: '2-digit',
  minute: '2-digit',
});

class SessionExpiredError extends Error {}

interface SafetyInfo {
  orderId: string;
  acknowledgementRequired: boolean;
  acknowledged: boolean;
  warnings: { allergyNote: string | null; itemAllergens: string[]; dietaryLabels: string[] };
}

function orderLabel(order: KitchenOrderDetails): string {
  return `#${order.orderId.slice(0, 8).toUpperCase()}`;
}

function parseQueue(response: unknown): KitchenOrderDetails[] {
  if (
    !response ||
    typeof response !== 'object' ||
    !('items' in response) ||
    !Array.isArray(response.items)
  ) {
    throw new Error('Invalid live Order Queue response');
  }
  // The queue is keyed by full UUID, never by the shortened display reference.
  // A malformed duplicate cannot produce two actionable cards.
  const unique = new Map<string, KitchenOrderDetails>();
  for (const raw of response.items) {
    const order = parseKitchenOrderDetails(raw);
    if (STATUSES.includes(order.status as KmsQueueStatus)) unique.set(order.orderId, order);
  }
  return [...unique.values()];
}

function parseSafety(response: unknown): SafetyInfo {
  if (!response || typeof response !== 'object') throw new Error('Invalid safety response');
  const value = response as Partial<SafetyInfo>;
  if (
    typeof value.acknowledgementRequired !== 'boolean' ||
    typeof value.acknowledged !== 'boolean' ||
    !value.warnings ||
    !Array.isArray(value.warnings.itemAllergens) ||
    !Array.isArray(value.warnings.dietaryLabels)
  ) {
    throw new Error('Invalid safety response');
  }
  return value as SafetyInfo;
}

async function fetchApi(
  path: string,
  action?: 'acknowledge' | 'start' | 'ready',
  signal?: AbortSignal,
): Promise<unknown> {
  // All browser reads have a finite deadline. The server BFF independently
  // times out its backend call; this also covers a lost browser connection.
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', forwardAbort, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(path, {
      method: action ? 'POST' : 'GET',
      ...(action
        ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          }
        : {}),
      cache: 'no-store',
      credentials: 'same-origin',
      signal: action ? signal : controller.signal,
    });
    if (response.status === 401) {
      throw new SessionExpiredError('Staff session expired. Sign in again.');
    }
    if (!response.ok) {
      let message = `Kitchen service request failed (${response.status})`;
      try {
        const body: unknown = await response.json();
        if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string')
          message = body.error;
      } catch {
        /* Use status as safe fallback. */
      }
      throw new Error(message);
    }
    return (await response.json()) as unknown;
  } catch (cause) {
    if (controller.signal.aborted && !signal?.aborted && !action) {
      throw new Error('Kitchen queue request timed out. Retrying automatically.');
    }
    throw cause;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

function statusOrders(orders: readonly KitchenOrderDetails[], status: KmsQueueStatus) {
  return orders
    .filter((order) => order.status === status)
    .sort(
      (a, b) =>
        Date.parse(a.placedAt) - Date.parse(b.placedAt) || a.orderId.localeCompare(b.orderId),
    );
}

export function LiveOrderQueueScreen() {
  const { push } = useRouter();
  const [orders, setOrders] = useState<KitchenOrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [modalOrder, setModalOrder] = useState<KitchenOrderDetails | null>(null);
  const [modalSafety, setModalSafety] = useState<SafetyInfo | null>(null);
  const [acknowledgedChecked, setAcknowledgedChecked] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const modalOpenRef = useRef(false);
  const mountedRef = useRef(false);
  const queueGateRef = useRef<QueueRefreshCoordinator<KitchenOrderDetails[]> | null>(null);
  const [queueStale, setQueueStale] = useState(false);

  const requestApi = useCallback(
    async (path: string, action?: 'acknowledge' | 'start' | 'ready', signal?: AbortSignal) => {
      try {
        return await fetchApi(path, action, signal);
      } catch (cause) {
        if (cause instanceof SessionExpiredError) {
          // A session-expiry response ends ALL future background polling immediately.
          queueGateRef.current?.expire();
          push('/login');
        }
        throw cause;
      }
    },
    [push],
  );

  const refreshQueue = useCallback(
    async (mode: 'initial' | 'poll' | 'manual' | 'after-action' = 'manual') => {
      const gate = queueGateRef.current;
      if (!gate || gate.isStopped) return;
      if (mode === 'poll' && (busyRef.current || modalOpenRef.current)) return;
      if (mode === 'manual' && (busyRef.current || modalOpenRef.current)) return;

      if (gate.isPending) {
        if (mode === 'after-action') {
          // Invalidate an older read; it may not overwrite the confirmed mutation.
          gate.cancelPending();
        } else if (mode === 'manual') {
          // Join the existing read rather than issuing a duplicate request.
          setFetching(true);
          return;
        } else {
          return;
        }
      }

      // No visible loading overlay or flicker during routine background refresh.
      if (mode === 'manual' || mode === 'after-action') setFetching(true);
      await gate.run(
        async (signal) => parseQueue(await requestApi('/api/kms/orders', undefined, signal)),
        (nextOrders) => {
          setOrders((previous) =>
            JSON.stringify(previous) === JSON.stringify(nextOrders) ? previous : nextOrders,
          );
          setError(null);
          setQueueStale(false);
          setLoading(false);
        },
        (cause) => {
          setError(cause instanceof Error ? cause.message : 'Unable to load the live Order Queue');
          setQueueStale(true);
          setLoading(false);
        },
        () => {
          setFetching(false);
          setLoading(false);
        },
      );
    },
    [requestApi],
  );

  useEffect(() => {
    const changed = () => {
      void refreshQueue('poll');
    };
    window.addEventListener('kms:refresh', changed);
    return () => window.removeEventListener('kms:refresh', changed);
  }, [refreshQueue]);

  // Five-second notice timeout is unchanged from the completed DDP-262 branch.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    mountedRef.current = true;
    const gate = new QueueRefreshCoordinator<KitchenOrderDetails[]>();
    queueGateRef.current = gate;

    // Avoid state-setting synchronously inside React's effect body.
    const initialLoad = window.setTimeout(() => void refreshQueue('initial'), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void refreshQueue('poll');
    }, getQueueRefreshIntervalMs());
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshQueue('poll');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      gate.stop();
      if (queueGateRef.current === gate) queueGateRef.current = null;
    };
  }, [refreshQueue]);

  // An order mutation must take precedence over any older in-flight queue read.
  function pauseQueueReadsForAction() {
    queueGateRef.current?.cancelPending();
    setFetching(false);
  }

  async function applyAction(orderId: string, action: 'start' | 'ready') {
    await requestApi(`/api/kms/orders/${encodeURIComponent(orderId)}`, action);
    await refreshQueue('after-action');
    if (!mountedRef.current) return;
    setNotice(action === 'start' ? 'Preparation started and saved.' : 'Order marked ready.');
  }

  async function handleStart(order: KitchenOrderDetails) {
    if (busyRef.current) return;
    busyRef.current = true;
    pauseQueueReadsForAction();
    setBusyOrderId(order.orderId);
    setNotice(null);
    if (!queueStale) setError(null);
    try {
      const safety = parseSafety(
        await requestApi(`/api/kms/orders/${encodeURIComponent(order.orderId)}`),
      );
      if (safety.acknowledgementRequired && !safety.acknowledged) {
        modalOpenRef.current = true;
        setModalOrder(order);
        setModalSafety(safety);
        setAcknowledgedChecked(false);
        setModalError(null);
      } else {
        await applyAction(order.orderId, 'start');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to start preparation');
      setQueueStale(true);
    } finally {
      busyRef.current = false;
      setBusyOrderId(null);
    }
  }

  async function handleReady(order: KitchenOrderDetails) {
    if (busyRef.current) return;
    busyRef.current = true;
    pauseQueueReadsForAction();
    setBusyOrderId(order.orderId);
    setNotice(null);
    if (!queueStale) setError(null);
    try {
      await applyAction(order.orderId, 'ready');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark the order ready');
      setQueueStale(true);
    } finally {
      busyRef.current = false;
      setBusyOrderId(null);
    }
  }

  async function handleAcknowledgeAndStart() {
    if (!modalOrder || !modalSafety || !acknowledgedChecked || busyRef.current) return;
    busyRef.current = true;
    pauseQueueReadsForAction();
    setBusyOrderId(modalOrder.orderId);
    setModalError(null);
    try {
      await requestApi(`/api/kms/orders/${encodeURIComponent(modalOrder.orderId)}`, 'acknowledge');
      await applyAction(modalOrder.orderId, 'start');
      modalOpenRef.current = false;
      setModalOrder(null);
      setModalSafety(null);
      setAcknowledgedChecked(false);
    } catch (cause) {
      setModalError(
        cause instanceof Error ? cause.message : 'Unable to confirm the allergy warning',
      );
    } finally {
      busyRef.current = false;
      setBusyOrderId(null);
    }
  }

  function closeModal() {
    if (busyRef.current) return;
    modalOpenRef.current = false;
    setModalOrder(null);
    setModalSafety(null);
    setAcknowledgedChecked(false);
    setModalError(null);
  }

  return (
    <section className={styles.board} aria-labelledby="order-queue-heading">
      {/* Keep an accessible page title without repeating the active navigation label. */}
      <h1 id="order-queue-heading" className={styles.visuallyHidden}>
        Order Queue
      </h1>
      {notice ? (
        <Alert
          className={live.alert}
          type="success"
          showIcon
          title={notice}
          closable
          onClose={() => setNotice(null)}
        />
      ) : null}
      {error ? (
        <Alert
          className={live.alert}
          type={queueStale ? 'warning' : 'error'}
          showIcon
          title={queueStale ? `Live queue may be out of date. ${error}` : error}
          action={
            <Button
              size="small"
              onClick={() => {
                void refreshQueue('manual');
              }}
            >
              Retry
            </Button>
          }
        />
      ) : null}
      {loading ? (
        <p role="status" className={live.loading}>
          Loading live kitchen orders…
        </p>
      ) : (
        <>
          <div className={styles.summaryBar} aria-label="Live Order Queue summary">
            {STATUSES.map((status) => (
              <div className={styles.summaryMetric} key={status}>
                <span className={styles.summaryLabel}>{LABELS[status]}</span>
                <strong>{statusOrders(orders, status).length}</strong>
              </div>
            ))}
            <div className={live.summaryActions}>
              <span className={queueStale ? live.delayedBadge : live.liveBadge}>
                {queueStale ? 'Updates delayed' : 'Live orders'}
              </span>
              <Button
                type="text"
                size="small"
                className={live.refreshButton}
                icon={<ReloadOutlined aria-hidden="true" />}
                onClick={() => {
                  void refreshQueue('manual');
                }}
                loading={fetching}
                disabled={fetching || busyOrderId !== null}
                aria-label="Refresh queue"
              >
                Refresh queue
              </Button>
            </div>
          </div>
          <div className={styles.columns}>
            {STATUSES.map((status) => (
              <section
                key={status}
                className={`${styles.column} ${COLUMN_STYLES[status]}`}
                aria-labelledby={`live-column-${status}`}
              >
                <header className={styles.columnHeader}>
                  <div className={styles.columnHeading}>
                    <span className={styles.columnDot} aria-hidden="true" />
                    <h2 className={styles.columnTitle} id={`live-column-${status}`}>
                      {LABELS[status]}
                    </h2>
                  </div>
                  <span className={styles.counter}>{statusOrders(orders, status).length}</span>
                </header>
                <div className={styles.columnContent}>
                  {statusOrders(orders, status).length === 0 ? (
                    <p className={styles.emptyState}>No orders in this stage.</p>
                  ) : (
                    statusOrders(orders, status).map((order) => (
                      <article
                        className={styles.orderCard}
                        key={order.orderId}
                        aria-label={`Order ${orderLabel(order)}`}
                      >
                        <div className={styles.orderHeader}>
                          <strong className={styles.orderReference} title={order.orderId}>
                            {orderLabel(order)}
                          </strong>
                          <span className={styles.roomBadge}>Room {order.roomNumber}</span>
                        </div>
                        <div className={styles.metaLine}>
                          <span className={styles.metaBadge}>
                            {order.mealPeriod.replaceAll('_', ' ')}
                          </span>
                          <span className={styles.metaBadge}>
                            {clock.format(new Date(order.placedAt))}
                          </span>
                          {order.allergyNote?.trim() ? (
                            <span className={live.warningBadge}>Allergy note</span>
                          ) : null}
                        </div>
                        <div className={styles.itemList}>
                          {order.items.length === 0 ? (
                            <p className={styles.emptyItems}>No item details available</p>
                          ) : (
                            order.items.map((item) => (
                              <div className={styles.item} key={item.orderItemId}>
                                <span className={styles.quantity}>{item.quantity} ×</span>
                                <span className={styles.itemName}>
                                  {item.name}
                                  {item.specialNote ? (
                                    <span className={styles.specialNote}>
                                      {' '}
                                      ({item.specialNote})
                                    </span>
                                  ) : null}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                        {order.allergyNote?.trim() ? (
                          <div className={styles.allergyWarning} role="note">
                            <strong>⚠ Allergy warning:</strong> {order.allergyNote}
                          </div>
                        ) : null}
                        <div className={styles.orderFooter}>
                          <div className={styles.orderTiming}>
                            <span>
                              {order.items.reduce((n, item) => n + item.quantity, 0)} portions
                            </span>
                            <span>
                              {getQueueOrderAgeMinutes(order.placedAt) ?? '—'} min elapsed
                            </span>
                          </div>
                          <div className={styles.orderActions}>
                            <Link
                              className={styles.detailsLink}
                              href={`/order-queue/${encodeURIComponent(order.orderId)}`}
                            >
                              View details
                            </Link>
                            {status === 'PLACED' ? (
                              <button
                                className={`${styles.previewActionButton} ${live.action}`}
                                type="button"
                                disabled={busyOrderId !== null}
                                onClick={() => {
                                  void handleStart(order);
                                }}
                              >
                                {busyOrderId === order.orderId ? 'Checking…' : 'Start preparation'}
                              </button>
                            ) : status === 'IN_PREPARATION' ? (
                              <button
                                className={`${styles.previewActionButton} ${live.readyAction}`}
                                type="button"
                                disabled={busyOrderId !== null}
                                onClick={() => {
                                  void handleReady(order);
                                }}
                              >
                                {busyOrderId === order.orderId ? 'Saving…' : 'Mark ready'}
                              </button>
                            ) : (
                              <span className={styles.deliveryStatus}>
                                Awaiting delivery worker
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <Modal
        centered
        // Ant Design v6 uses semantic 'container', not the legacy .ant-modal-content.
        // Inline semantic styles ensure the high-contrast warning header survives
        // CSS-in-JS insertion order and modal portal rendering.
        styles={{
          container: {
            padding: 0,
            border: '1px solid #ccd2d3',
            borderRadius: 12,
            background: '#ffffff',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100dvh - 40px)',
          },
          header: {
            margin: 0,
            padding: '21px 54px 20px 26px',
            background: '#8d191b',
            borderBottom: 'none',
            flexShrink: 0,
          },
          title: {
            margin: 0,
            color: '#ffffff',
            fontSize: 16,
            lineHeight: 1.4,
          },
          close: {
            color: '#ffffff',
            top: 15,
            right: 15,
          },
          body: {
            padding: 0,
            minHeight: 0,
            overflowY: 'auto',
            flex: '1 1 auto',
          },
        }}
        title={
          <div className={live.modalTitle}>
            <span className={live.modalTitleIcon} aria-hidden="true">
              ⚠
            </span>
            <div>
              <strong>Allergy &amp; Dietary Acknowledgement Required</strong>
              <p>
                Review the current warnings before starting preparation. Confirmation is recorded
                against your verified staff session.
              </p>
            </div>
          </div>
        }
        open={modalOrder !== null}
        onCancel={closeModal}
        footer={null}
        // Allow background-click or Escape to cancel a review, but never while saving.
        mask={{ closable: busyOrderId === null }}
        keyboard={busyOrderId === null}
        closable={busyOrderId === null}
        destroyOnHidden
        width={590}
      >
        {modalOrder && modalSafety ? (
          <div className={live.modalBody}>
            <div className={live.modalMeta} aria-label="Order summary">
              <span>
                Order <strong>{orderLabel(modalOrder)}</strong>
              </span>
              <span>
                Room <strong>{modalOrder.roomNumber}</strong>
              </span>
              <span>
                Period <strong>{modalOrder.mealPeriod.replaceAll('_', ' ')}</strong>
              </span>
              <span>
                Placed <strong>{clock.format(new Date(modalOrder.placedAt))}</strong>
              </span>
            </div>
            <section className={live.modalItemSection} aria-label="Ordered items">
              <h3>ORDER ITEMS</h3>
              <ul className={live.modalItems}>
                {modalOrder.items.map((item) => (
                  <li key={item.orderItemId}>
                    <span className={live.modalQuantity}>{item.quantity}×</span>
                    <span>
                      {item.name}
                      {item.specialNote ? <small> — {item.specialNote}</small> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className={live.modalWarningSection} aria-label="Allergy and dietary warnings">
              <h3>⚠ ALLERGY &amp; DIETARY REQUIREMENTS</h3>
              <div className={live.warningPanel}>
                <strong className={live.warningPanelTitle}>
                  ⚠ Dietary and allergen warnings found
                </strong>
                {modalSafety.warnings.itemAllergens.length > 0 ? (
                  <p className={live.warningChips}>
                    <strong>Item allergens:</strong>{' '}
                    {modalSafety.warnings.itemAllergens.map((value) => (
                      <Tag key={value} className={live.warningTag}>
                        {value}
                      </Tag>
                    ))}
                  </p>
                ) : null}
                {modalSafety.warnings.dietaryLabels.length > 0 ? (
                  <p className={live.warningChips}>
                    <strong>Dietary labels:</strong>{' '}
                    {modalSafety.warnings.dietaryLabels.map((value) => (
                      <Tag key={value} className={live.dietaryTag}>
                        {value}
                      </Tag>
                    ))}
                  </p>
                ) : null}
                {modalSafety.warnings.allergyNote ? (
                  <blockquote className={live.guestNote}>
                    <strong>Guest instructions</strong>
                    <p>{modalSafety.warnings.allergyNote}</p>
                  </blockquote>
                ) : null}
                <p className={live.warningDisclaimer}>
                  Warnings are based on current menu information. Checking a warning does not
                  guarantee an allergen-free meal.
                </p>
              </div>
            </section>
            <div className={live.acknowledgementPanel}>
              <Checkbox
                checked={acknowledgedChecked}
                disabled={busyOrderId !== null}
                onChange={(event) => setAcknowledgedChecked(event.target.checked)}
              >
                I confirm I have reviewed the allergy and dietary warnings. I will follow the
                kitchen&apos;s safe food-handling and cross-contact prevention procedures.
              </Checkbox>
            </div>
            {modalError ? <Alert type="error" title={modalError} showIcon /> : null}
            <div className={live.modalActions}>
              <Button onClick={closeModal} disabled={busyOrderId !== null}>
                Cancel
              </Button>
              <Button
                className={live.modalConfirmButton}
                type="primary"
                disabled={!acknowledgedChecked}
                loading={busyOrderId !== null}
                onClick={() => {
                  void handleAcknowledgeAndStart();
                }}
              >
                ✓ Confirm &amp; start preparation
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
