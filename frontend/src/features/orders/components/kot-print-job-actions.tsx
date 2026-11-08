'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  parseKotPrintJobs,
  parseKotPrintRequest,
  type KotPrintJob,
} from '../api/kot-print-jobs.contract';
import styles from './kot-print-job-actions.module.css';

const hotelTime = new Intl.DateTimeFormat('en-LK', {
  timeZone: 'Asia/Colombo',
  dateStyle: 'medium',
  timeStyle: 'short',
});

class SessionExpiredError extends Error {}

async function requestJobs(
  orderId: string,
  action?: { action: 'request' } | { action: 'cancel'; kotId: string },
): Promise<unknown> {
  const response = await fetch(`/api/kms/orders/${encodeURIComponent(orderId)}/kot-print-jobs`, {
    method: action ? 'POST' : 'GET',
    ...(action
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) }
      : {}),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (response.status === 401) throw new SessionExpiredError('Session expired. Sign in again.');
  if (!response.ok) {
    let message = `Unable to access KOT print jobs (HTTP ${response.status}).`;
    try {
      const data: unknown = await response.json();
      if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
        message = data.error;
      }
    } catch {
      // Keep safe HTTP fallback.
    }
    throw new Error(message);
  }
  return (await response.json()) as unknown;
}

export function KotPrintJobActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<KotPrintJob[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const rows = parseKotPrintJobs(await requestJobs(orderId), orderId);
        if (active) setJobs(rows);
      } catch (cause) {
        if (!active) return;
        if (cause instanceof SessionExpiredError) router.push('/login');
        setError(cause instanceof Error ? cause.message : 'Unable to load print-job history.');
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId, router]);

  async function run(action: 'refresh' | 'request' | 'cancel', kotId?: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (action === 'request') {
        const result = parseKotPrintRequest(
          await requestJobs(orderId, { action: 'request' }),
          orderId,
        );
        setNotice(
          result.created
            ? 'Pending print request saved. No physical printing has been confirmed.'
            : 'The existing pending print request was reused.',
        );
      } else if (action === 'cancel' && kotId) {
        await requestJobs(orderId, { action: 'cancel', kotId });
        setConfirmCancel(null);
        setNotice('Pending print request cancelled in the database.');
      }
      setJobs(parseKotPrintJobs(await requestJobs(orderId), orderId));
    } catch (cause) {
      if (cause instanceof SessionExpiredError) router.push('/login');
      setError(cause instanceof Error ? cause.message : 'Unable to update print-job status.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const pending = jobs?.find((job) => job.printStatus === 'PENDING');
  const hasPrinted = jobs?.some((job) => job.printStatus === 'PRINTED');

  return (
    <section className={styles.area} aria-labelledby="kot-print-jobs-heading">
      <h2 id="kot-print-jobs-heading">Print-job tracking</h2>
      <p className={styles.note}>
        Requests are saved as <strong>PENDING</strong>. No ticket is sent to a physical printer by
        this screen. Only a verified Printing Service receipt may confirm printing success.
      </p>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.primary}
          disabled={busy || jobs === null || Boolean(pending)}
          onClick={() => void run('request')}
        >
          {pending
            ? 'Pending request already recorded'
            : hasPrinted
              ? 'Record reprint request'
              : 'Record print request'}
        </button>
        <button type="button" disabled={busy} onClick={() => void run('refresh')}>
          Refresh status
        </button>
      </div>
      {jobs === null && !error ? (
        <p className={styles.note}>Loading saved print-job history…</p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {jobs?.length === 0 ? <p className={styles.note}>No print requests recorded yet.</p> : null}
      {jobs && jobs.length > 0 ? (
        <ol className={styles.history} aria-label="Saved print-job history">
          {jobs.map((job) => (
            <li key={job.kotId} className={styles.job}>
              <div className={styles.jobTop}>
                <strong>{job.printStatus.replaceAll('_', ' ')}</strong>
                <time dateTime={job.createdAt}>{hotelTime.format(new Date(job.createdAt))}</time>
              </div>
              <p className={styles.identifier}>Job: {job.kotId}</p>
              {job.printedAt ? (
                <p className={styles.note}>
                  Recorded as printed: {hotelTime.format(new Date(job.printedAt))}
                  {job.printerName ? ` · ${job.printerName}` : ''}
                </p>
              ) : null}
              {job.printStatus === 'PENDING' ? (
                confirmCancel === job.kotId ? (
                  <div className={styles.toolbar}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run('cancel', job.kotId)}
                    >
                      Confirm cancellation
                    </button>
                    <button type="button" disabled={busy} onClick={() => setConfirmCancel(null)}>
                      Keep request
                    </button>
                  </div>
                ) : (
                  <button type="button" disabled={busy} onClick={() => setConfirmCancel(job.kotId)}>
                    Cancel pending request
                  </button>
                )
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
