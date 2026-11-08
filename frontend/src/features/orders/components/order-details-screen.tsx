import Link from 'next/link';

import type { KitchenOrderDetails } from '../api/order-details.contract';

import styles from './order-details-screen.module.css';

interface OrderDetailsScreenProps {
  order: KitchenOrderDetails;
}

type TimelineState = 'complete' | 'current' | 'upcoming';

type TimelineStep = {
  label: string;
  state: TimelineState;
  time?: string;
};

const orderedStages = ['PLACED', 'IN_PREPARATION', 'READY', 'DELIVERED'] as const;

const stageNames: Record<(typeof orderedStages)[number], string> = {
  PLACED: 'Order placed',
  IN_PREPARATION: 'In preparation',
  READY: 'Ready for delivery',
  DELIVERED: 'Delivered',
};

const hotelTimeFormatter = new Intl.DateTimeFormat('en-LK', {
  timeZone: 'Asia/Colombo',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const hotelClockFormatter = new Intl.DateTimeFormat('en-LK', {
  timeZone: 'Asia/Colombo',
  hour: '2-digit',
  minute: '2-digit',
});

function formatHotelTime(value: string): string {
  return hotelTimeFormatter.format(new Date(value));
}

function formatClock(value: string): string {
  return hotelClockFormatter.format(new Date(value));
}

function formatStoredAmount(value: number): string {
  return value.toLocaleString('en-LK');
}

function statusLabel(status: KitchenOrderDetails['status']): string {
  return status.replaceAll('_', ' ');
}

function timelineForOrder(order: KitchenOrderDetails): TimelineStep[] {
  if (order.status === 'CANCELLED') {
    return [
      { label: stageNames.PLACED, state: 'complete', time: order.placedAt },
      { label: 'Cancelled', state: 'current' },
    ];
  }

  const currentIndex = orderedStages.findIndex((stage) => stage === order.status);

  return orderedStages.map((stage, index) => {
    const state: TimelineState =
      index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';

    return {
      label: stageNames[stage],
      state,
      ...(stage === 'PLACED' ? { time: order.placedAt } : {}),
    };
  });
}

function nextActionLabel(order: KitchenOrderDetails): string | null {
  if (order.status === 'PLACED') {
    return order.allergyNote?.trim() ? 'Acknowledge allergy & start prep' : 'Start preparation';
  }
  if (order.status === 'IN_PREPARATION') return 'Mark ready';
  return null;
}

export function OrderDetailsScreen({ order }: OrderDetailsScreenProps) {
  const portions = order.items.reduce((count, item) => count + item.quantity, 0);
  const allergyNote = order.allergyNote?.trim();
  const nextAction = nextActionLabel(order);
  const timeline = timelineForOrder(order);

  return (
    <section className={styles.workspace} aria-label="Kitchen order details workspace">
      <aside className={styles.queueSidebar} aria-label="Order queue navigation">
        <div className={styles.sidebarHeading}>
          <span className={styles.microLabel}>ORDER QUEUE</span>
          <h2>Kitchen workspace</h2>
          <p>Selected order</p>
        </div>

        <div className={styles.sidebarSection}>
          <p className={styles.sectionLabel}>CURRENT ORDER</p>
          <div className={styles.selectedOrder} aria-current="page">
            <div className={styles.selectedTop}>
              <strong>Order details</strong>
              <span className={`${styles.miniStatus} ${styles[order.status]}`}>
                {statusLabel(order.status)}
              </span>
            </div>
            <span className={styles.sidebarOrderId}>{order.orderId}</span>
            <div className={styles.selectedMeta}>
              <span>Room {order.roomNumber}</span>
              <span>{formatClock(order.placedAt)}</span>
              <span>{portions} portions</span>
            </div>
          </div>
        </div>

        <div className={styles.sidebarHelp}>
          <strong>Active order queue</strong>
          <p>
            The full queue board is still in preview. Live order lists will be connected in DDP-262.
          </p>
          <Link href="/order-queue" className={styles.sidebarLink}>
            Open Order Queue
          </Link>
        </div>
      </aside>

      <div className={styles.mainContent}>
        <nav className={styles.breadcrumb} aria-label="Order navigation">
          <Link href="/order-queue">Order Queue</Link>
          <span aria-hidden="true">/</span>
          <span>Order Details</span>
        </nav>

        <header className={styles.header}>
          <div className={styles.headingContent}>
            <p className={styles.eyebrow}>KITCHEN ORDER</p>
            <h1 id="order-details-heading">Order Details</h1>
            <p className={styles.orderId}>
              <span className={styles.label}>Order ID</span>
              <span>{order.orderId}</span>
            </p>
          </div>
          <span className={`${styles.status} ${styles[order.status]}`}>
            {statusLabel(order.status)}
          </span>
        </header>

        <div className={styles.quickFacts} aria-label="Order summary">
          <div>
            <span className={styles.label}>Room</span>
            <strong>{order.roomNumber}</strong>
          </div>
          <div>
            <span className={styles.label}>Meal period</span>
            <strong>{order.mealPeriod.replaceAll('_', ' ')}</strong>
          </div>
          <div>
            <span className={styles.label}>Placed (hotel time)</span>
            <strong>
              <time dateTime={order.placedAt}>{formatHotelTime(order.placedAt)}</time>
            </strong>
          </div>
          <div>
            <span className={styles.label}>Estimated delivery</span>
            <strong>
              {order.estimatedDeliveryTime ? (
                <time dateTime={order.estimatedDeliveryTime}>
                  {formatHotelTime(order.estimatedDeliveryTime)}
                </time>
              ) : (
                'Not available'
              )}
            </strong>
          </div>
        </div>

        <section className={styles.itemsPanel} aria-labelledby="ordered-items-heading">
          <div className={styles.panelHeader}>
            <h2 id="ordered-items-heading">Ordered items</h2>
            <span>{portions} portions</span>
          </div>
          {order.items.length === 0 ? (
            <p className={styles.empty}>No stored line items are available for this order.</p>
          ) : (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Item / preparation instructions</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Unit price*</th>
                    <th scope="col">Subtotal*</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.orderItemId}>
                      <th scope="row">
                        <span className={styles.itemName}>{item.name}</span>
                        {item.specialNote?.trim() ? (
                          <p className={styles.instructions}>
                            <strong>Special instruction:</strong> {item.specialNote}
                          </p>
                        ) : null}
                      </th>
                      <td className={styles.itemQuantity}>{item.quantity}×</td>
                      <td>{formatStoredAmount(item.unitPrice)}</td>
                      <td>{formatStoredAmount(item.unitPrice * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan={3}>
                      Order total*
                    </th>
                    <td>{formatStoredAmount(order.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className={styles.amountFootnote}>
            * Amounts are shown in the database&apos;s stored integer units until the currency
            contract is finalized.
          </p>
        </section>

        <section className={styles.safetySection} aria-labelledby="allergy-section-heading">
          <h2 id="allergy-section-heading">Allergy &amp; dietary information</h2>
          {allergyNote ? (
            <div className={styles.allergy} role="note" aria-label="Guest allergy warning">
              <h3>⚠ Allergy warning — review before preparation</h3>
              <p className={styles.allergyBody}>{allergyNote}</p>
              <p className={styles.allergyHint}>
                Allergy acknowledgement must be completed before preparation. The workflow is
                planned for DDP-260.
              </p>
            </div>
          ) : (
            <div className={styles.noAllergy}>
              No order-level allergy note was provided. This does not guarantee an allergen-free
              meal.
            </div>
          )}
          <p className={styles.dietaryNotice}>
            Item-level dietary and allergen labels will appear when supported by the approved API.
            Never assume an item is allergen-free from missing information.
          </p>
        </section>
      </div>

      <aside
        className={styles.timelineSidebar}
        role="region"
        aria-label="Order timeline and actions"
      >
        <section className={styles.timelineSection} aria-labelledby="order-timeline-heading">
          <h2 id="order-timeline-heading">Order timeline</h2>
          <ol className={styles.timeline}>
            {timeline.map((step) => (
              <li key={step.label} className={`${styles.timelineStep} ${styles[step.state]}`}>
                <span className={styles.timelineMarker} aria-hidden="true">
                  {step.state === 'complete' ? '✓' : step.state === 'current' ? '●' : ''}
                </span>
                <div>
                  <strong>{step.label}</strong>
                  {step.time ? (
                    <time dateTime={step.time}>{formatHotelTime(step.time)}</time>
                  ) : step.state === 'current' ? (
                    <span>Current status</span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.sidebarCard} aria-labelledby="kot-card-heading">
          <h2 id="kot-card-heading">Kitchen order ticket (KOT)</h2>
          <p>Ticket preview and print-job status are not available yet.</p>
          <button className={styles.disabledButton} type="button" disabled>
            Print / reprint KOT — DDP-265
          </button>
        </section>

        <section className={styles.sidebarCard} aria-labelledby="prep-actions-heading">
          <h2 id="prep-actions-heading">Preparation actions</h2>
          {nextAction ? (
            <>
              <p>
                Order status updates are not available until the safety and lifecycle APIs are
                ready.
              </p>
              <button className={styles.disabledButton} type="button" disabled>
                {nextAction}
              </button>
            </>
          ) : (
            <p>
              {order.status === 'READY'
                ? 'Ready for delivery. Assignment and handoff are handled in a later workflow.'
                : order.status === 'DELIVERED'
                  ? 'This order is marked as delivered.'
                  : 'This order has been cancelled.'}
            </p>
          )}
        </section>
      </aside>

      <footer className={styles.workspaceFooter}>
        <p>
          Read-only order details. Preparation, acknowledgement and ticket actions will be enabled
          with their respective backend workflows.
        </p>
        <Link href="/order-queue" className={styles.backLink}>
          Back to Order Queue
        </Link>
      </footer>
    </section>
  );
}
