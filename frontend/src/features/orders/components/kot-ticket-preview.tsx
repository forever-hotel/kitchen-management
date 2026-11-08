import type { KotPreview } from '../api/kot-preview.contract';

import { KotPrintJobActions } from './kot-print-job-actions';
import styles from './kot-ticket-preview.module.css';

const formatHotelDate = new Intl.DateTimeFormat('en-LK', {
  timeZone: 'Asia/Colombo',
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function KotTicketPreview({ ticket }: { ticket: KotPreview }) {
  return (
    <section className={styles.workspace} aria-label="Kitchen order ticket preview">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>FOREVER HOTEL · KITCHEN</p>
          <h1>Kitchen Order Ticket</h1>
          <p className={styles.reference}>Order reference: {ticket.orderId}</p>
        </div>
        <span className={styles.previewBadge}>PREVIEW ONLY</span>
      </header>

      <div className={styles.notice} role="note">
        This is the order-content preview, not proof of physical printing.
      </div>

      <dl className={styles.summary}>
        <div>
          <dt>Room</dt>
          <dd>{ticket.roomNumber}</dd>
        </div>
        <div>
          <dt>Meal period</dt>
          <dd>{ticket.mealPeriod.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Current status</dt>
          <dd>{ticket.status.replaceAll('_', ' ')}</dd>
        </div>
        <div>
          <dt>Placed (hotel time)</dt>
          <dd>
            <time dateTime={ticket.placedAt}>
              {formatHotelDate.format(new Date(ticket.placedAt))}
            </time>
          </dd>
        </div>
      </dl>

      <div className={styles.contentGrid}>
        <section className={styles.itemsPanel} aria-labelledby="kot-items-title">
          <h2 id="kot-items-title" className={styles.sectionHeading}>
            Preparation items
          </h2>
          {ticket.items.length ? (
            <ol className={styles.items}>
              {ticket.items.map((item) => (
                <li key={item.orderItemId} className={styles.item}>
                  <strong className={styles.quantity}>{item.quantity} ×</strong>
                  <div>
                    <strong className={styles.itemName}>{item.name}</strong>
                    {item.specialNote?.trim() ? (
                      <p className={styles.specialNote}>
                        <strong>Special instruction:</strong> {item.specialNote}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.muted}>No stored items are available for this order.</p>
          )}
        </section>

        <div className={styles.rightColumn}>
          <section aria-labelledby="kot-allergy-title" className={styles.safety}>
            <h2 id="kot-allergy-title" className={styles.sectionHeading}>
              Allergy &amp; dietary instructions
            </h2>
            {ticket.allergyNote?.trim() ? (
              <p className={styles.allergy} role="note" aria-label="Guest allergy warning">
                <strong>⚠ Guest allergy note:</strong> {ticket.allergyNote}
              </p>
            ) : (
              <p className={styles.muted}>
                No order-level allergy note supplied. Do not assume allergen-free preparation.
              </p>
            )}
          </section>

          <KotPrintJobActions orderId={ticket.orderId} />
        </div>
      </div>
    </section>
  );
}
