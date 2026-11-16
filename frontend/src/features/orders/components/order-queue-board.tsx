'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';

import {
  getQueueItemQuantityTotal,
  getQueueOrderAgeMinutes,
  groupQueueOrders,
} from '../lib/order-queue.utils';
import {
  KMS_QUEUE_STATUSES,
  type KmsQueueOrder,
  type KmsQueueStatus,
} from '../types/order-queue.types';

import styles from './order-queue-board.module.css';

interface OrderQueueBoardProps {
  orders: readonly KmsQueueOrder[];
  asOf: string;
  /** Explicit fixture-only flags. No KMS escalation time threshold is approved. */
  escalatedOrderReferences?: readonly string[];
}

const columnLabels: Record<KmsQueueStatus, string> = {
  PLACED: 'New Orders',
  IN_PREPARATION: 'In Preparation',
  READY: 'Ready for Delivery',
};

const columnStyles: Record<KmsQueueStatus, string> = {
  PLACED: styles.laneNew,
  IN_PREPARATION: styles.lanePreparing,
  READY: styles.laneReady,
};

// Both the server and the browser's initial hydration render use `false`.
// The fixture-only escalation decoration appears after hydration.
function subscribeToHydration() {
  return () => {};
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Colombo',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function getPlacedTime(isoDate: string): string {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : timeFormatter.format(date);
}

function OrderCard({
  order,
  asOf,
  isEscalated,
}: {
  order: KmsQueueOrder;
  asOf: string;
  isEscalated: boolean;
}) {
  const ageMinutes = getQueueOrderAgeMinutes(order.placedAt, new Date(asOf));
  const totalQuantity = getQueueItemQuantityTotal(order);
  const allergy = order.allergyNote?.trim();
  const requiresAcknowledgement = Boolean(allergy) || order.dietaryLabels.length > 0;

  const previewAction =
    order.status === 'PLACED'
      ? requiresAcknowledgement
        ? 'Acknowledge & Start'
        : 'Start Preparation'
      : order.status === 'IN_PREPARATION'
        ? 'Mark Ready'
        : null;

  return (
    <article
      className={`${styles.orderCard}${isEscalated ? ` ${styles.escalatedCard}` : ''}`}
      aria-label={`Order ${order.orderReference}${isEscalated ? ', escalated' : ''}`}
    >
      <div className={styles.orderHeader}>
        <strong className={styles.orderReference}>{order.orderReference}</strong>
        <span className={styles.roomBadge}>Room {order.roomNumber}</span>
      </div>

      <div className={styles.metaLine}>
        <span className={styles.metaBadge}>{order.mealPeriod.replaceAll('_', ' ')}</span>
        <span className={styles.metaBadge}>{getPlacedTime(order.placedAt)}</span>
        {isEscalated ? (
          <span className={styles.escalatedBadge} aria-label="Escalated order">
            ⚠ Escalated
          </span>
        ) : null}
      </div>

      <div className={styles.itemList}>
        {order.items.length === 0 ? (
          <p className={styles.emptyItems}>Item details unavailable</p>
        ) : (
          order.items.map((item) => (
            <div className={styles.item} key={item.orderItemId}>
              <span className={styles.quantity}>{item.quantity} ×</span>
              <span className={styles.itemName}>
                {item.name}
                {item.specialNote ? (
                  <span className={styles.specialNote}> ({item.specialNote})</span>
                ) : null}
              </span>
            </div>
          ))
        )}
      </div>

      {allergy ? (
        <div className={styles.allergyWarning} role="note" aria-label="Allergy warning">
          <span aria-hidden="true">⚠</span>
          <span>
            <strong>Allergy note</strong> — {allergy}
          </span>
        </div>
      ) : null}

      {order.dietaryLabels.length > 0 ? (
        <div className={styles.dietaryLabels}>
          {order.dietaryLabels.map((label) => (
            <span key={label} className={styles.dietaryBadge}>
              {label.replaceAll('_', ' ')}
            </span>
          ))}
        </div>
      ) : null}

      <div className={styles.orderFooter}>
        <div className={styles.orderTiming}>
          <span className={styles.age}>
            {ageMinutes === null ? 'Age unavailable' : `${ageMinutes} min ago`}
          </span>
          <span className={styles.portions}>{totalQuantity} portions</span>
          {order.estimatedPreparationMinutes !== null ? (
            <span className={styles.prepEstimate}>
              Est. prep {order.estimatedPreparationMinutes} min
            </span>
          ) : null}
        </div>
        <div className={styles.orderActions}>
          <Link
            className={styles.detailsLink}
            href={`/order-queue/${encodeURIComponent(order.orderId)}`}
            aria-label={`View details for ${order.orderReference}`}
          >
            View details
          </Link>

          {previewAction ? (
            <button
              type="button"
              className={styles.previewActionButton}
              disabled
              title="Unavailable in fixture preview: requires live KMS order APIs"
              aria-label={`${previewAction} unavailable for ${order.orderReference} until KMS order APIs are connected`}
            >
              {previewAction}
            </button>
          ) : order.status === 'READY' ? (
            <span className={styles.deliveryStatus}>Awaiting delivery worker</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function OrderQueueBoard({
  orders,
  asOf,
  escalatedOrderReferences = [],
}: OrderQueueBoardProps) {
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const groupedOrders = groupQueueOrders(orders);

  return (
    <section aria-labelledby="order-queue-heading" className={styles.board}>
      <h2 id="order-queue-heading" className={styles.visuallyHidden}>
        Order Queue
      </h2>

      {/* Use only fixture-backed active-stage metrics; no invented delivery KPI. */}
      <div className={styles.summaryBar} aria-label="Queue summary">
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>New</span>
          <strong className={styles.summaryValueNew}>{groupedOrders.PLACED.length}</strong>
        </div>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>In prep</span>
          <strong>{groupedOrders.IN_PREPARATION.length}</strong>
        </div>
        <div className={styles.summaryMetric}>
          <span className={styles.summaryLabel}>Ready</span>
          <strong className={styles.summaryValueReady}>{groupedOrders.READY.length}</strong>
        </div>
        <div className={styles.fixtureNotice}>Demonstration data — not live</div>
        <span className={styles.actionPreviewNotice}>
          Preparation actions are disabled in preview
        </span>
      </div>

      <div className={styles.columns}>
        {KMS_QUEUE_STATUSES.map((status) => {
          const columnOrders = groupedOrders[status];
          const headingId = `kms-column-${status.toLowerCase()}`;

          return (
            <section
              key={status}
              className={`${styles.column} ${columnStyles[status]}`}
              aria-labelledby={headingId}
            >
              <header className={styles.columnHeader}>
                <div className={styles.columnHeading}>
                  <span className={styles.columnDot} aria-hidden="true" />
                  <h3 id={headingId} className={styles.columnTitle}>
                    {columnLabels[status]}
                  </h3>
                </div>
                <span className={styles.counter} aria-label={`${columnOrders.length} orders`}>
                  {columnOrders.length}
                </span>
              </header>

              <div className={styles.columnContent}>
                {columnOrders.length === 0 ? (
                  <p className={styles.emptyState}>No orders in this stage.</p>
                ) : (
                  columnOrders.map((order) => (
                    <OrderCard
                      key={order.orderId}
                      order={order}
                      asOf={asOf}
                      isEscalated={
                        hasHydrated &&
                        status === 'PLACED' &&
                        escalatedOrderReferences.includes(order.orderReference)
                      }
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
