import Link from 'next/link';

export default function OrderNotFound() {
  return (
    <section aria-labelledby="order-not-found-heading">
      <h1 id="order-not-found-heading">Order not found</h1>
      <p>The requested food order does not exist or the order reference is invalid.</p>
      <Link href="/order-queue">Back to Order Queue</Link>
    </section>
  );
}
