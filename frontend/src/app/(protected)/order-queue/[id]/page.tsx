import Link from 'next/link';

interface OrderDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { id } = await params;

  return (
    <section>
      <Link href="/order-queue">Back to Order Queue</Link>

      <h2>Order Details</h2>

      <p>Order ID: {id}</p>

      <p>
        The complete order details and lifecycle actions will be implemented in the next development
        issue.
      </p>

      <p>This page currently uses demonstration navigation. No live order has been retrieved.</p>
    </section>
  );
}
