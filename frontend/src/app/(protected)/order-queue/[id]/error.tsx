'use client';

import Link from 'next/link';

export default function OrderDetailsError({ reset }: { reset: () => void }) {
  return (
    <section role="alert" aria-labelledby="order-details-error-heading">
      <h1 id="order-details-error-heading">Unable to load order details</h1>
      <p>Please check the kitchen connection or your access permissions and try again.</p>
      <button type="button" onClick={reset}>
        Retry
      </button>
      {' · '}
      <Link href="/order-queue">Back to Order Queue</Link>
    </section>
  );
}
