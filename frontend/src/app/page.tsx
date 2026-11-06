import Link from 'next/link';

export default function Home() {
  return (
    <section aria-labelledby="kms-foundation-heading">
      <h2 id="kms-foundation-heading">KMS frontend foundation</h2>
      <p>The Kitchen Management System frontend is ready for feature development.</p>
      {process.env.NODE_ENV !== 'production' && (
        <nav aria-label="Local UI preview pages">
          <p>Local UI preview (sample data only):</p>
          <p>
            <Link href="/menu-management">View Menu Management</Link>
            {' · '}
            <Link href="/time-windows">View Ordering Time Windows</Link>
          </p>
        </nav>
      )}
    </section>
  );
}
