'use client';

import { Alert, Button, Checkbox, Modal } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type { KitchenOrderDetails } from '../api/order-details.contract';
import styles from './order-details-preparation-actions.module.css';

type OrderStatus = KitchenOrderDetails['status'];
type KitchenAction = 'acknowledge' | 'start' | 'ready';

interface SafetyInformation {
  orderId: string;
  acknowledgementRequired: boolean;
  acknowledged: boolean;
  warnings: {
    allergyNote: string | null;
    itemAllergens: string[];
    dietaryLabels: string[];
  };
}

class SessionExpiredError extends Error {}

function parseSafety(value: unknown, expectedOrderId: string): SafetyInformation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid kitchen allergy safety response');
  }
  const safety = value as Partial<SafetyInformation>;
  const warning = safety.warnings;
  if (
    safety.orderId !== expectedOrderId ||
    typeof safety.acknowledgementRequired !== 'boolean' ||
    typeof safety.acknowledged !== 'boolean' ||
    !warning ||
    !(warning.allergyNote === null || typeof warning.allergyNote === 'string') ||
    !Array.isArray(warning.itemAllergens) ||
    !warning.itemAllergens.every((item) => typeof item === 'string') ||
    !Array.isArray(warning.dietaryLabels) ||
    !warning.dietaryLabels.every((item) => typeof item === 'string')
  ) {
    throw new Error('Invalid kitchen allergy safety response');
  }
  return safety as SafetyInformation;
}

async function requestKitchenAction(
  orderId: string,
  action: KitchenAction | null,
  signal: AbortSignal,
): Promise<unknown> {
  const response = await fetch(`/api/kms/orders/${encodeURIComponent(orderId)}`, {
    method: action ? 'POST' : 'GET',
    ...(action
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }
      : {}),
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });
  if (response.status === 401)
    throw new SessionExpiredError('Staff session expired. Sign in again.');
  if (!response.ok) {
    let message = `Kitchen order request failed (HTTP ${response.status})`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // Keep the HTTP status as the safe fallback.
    }
    throw new Error(message);
  }
  return (await response.json()) as unknown;
}

export function OrderDetailsPreparationActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [safety, setSafety] = useState<SafetyInformation | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const busyRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  async function request(action: KitchenAction | null) {
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      return await requestKitchenAction(orderId, action, controller.signal);
    } catch (cause) {
      if (cause instanceof SessionExpiredError) {
        router.push('/login');
      }
      if (controller.signal.aborted) {
        throw new Error('Kitchen request timed out. Check the order state and retry.');
      }
      throw cause;
    } finally {
      window.clearTimeout(timeout);
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  async function runSafely(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the kitchen order');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function startPreparation() {
    await runSafely(async () => {
      const currentSafety = parseSafety(await request(null), orderId);
      if (currentSafety.acknowledgementRequired && !currentSafety.acknowledged) {
        setSafety(currentSafety);
        setConfirmed(false);
        return;
      }
      await request('start');
      setNotice('Preparation started. Refreshing saved order status.');
      router.refresh();
    });
  }

  async function markReady() {
    await runSafely(async () => {
      await request('ready');
      setNotice('Order marked ready. Refreshing saved order status.');
      router.refresh();
    });
  }

  async function acknowledgeAndStart() {
    if (!safety || !confirmed) return;
    await runSafely(async () => {
      // The backend acknowledges a warning fingerprint for the verified actor;
      // it rechecks safety inside the transactional status transition.
      await request('acknowledge');
      await request('start');
      setSafety(null);
      setConfirmed(false);
      setNotice('Allergy acknowledgement recorded and preparation started.');
      router.refresh();
    });
  }

  const hasAction = status === 'PLACED' || status === 'IN_PREPARATION';

  return (
    <div className={styles.actions}>
      {status === 'PLACED' ? (
        <>
          <p>Check current allergen and dietary warnings before starting preparation.</p>
          <Button
            type="primary"
            block
            disabled={busy || safety !== null}
            loading={busy}
            onClick={() => void startPreparation()}
          >
            Start preparation
          </Button>
        </>
      ) : status === 'IN_PREPARATION' ? (
        <>
          <p>Confirm that preparation is complete before marking this order ready.</p>
          <Button
            type="primary"
            block
            disabled={busy}
            loading={busy}
            onClick={() => void markReady()}
          >
            Mark ready
          </Button>
        </>
      ) : (
        <p>
          {status === 'READY'
            ? 'Ready for delivery. Assignment and handoff happen in the delivery workflow.'
            : status === 'DELIVERED'
              ? 'This order has been delivered.'
              : 'This order has been cancelled.'}
        </p>
      )}

      {error ? <Alert type="error" showIcon title={error} className={styles.feedback} /> : null}
      {notice ? <Alert type="success" showIcon title={notice} className={styles.feedback} /> : null}

      <Modal
        title="Allergy and dietary acknowledgement"
        open={safety !== null && hasAction}
        onCancel={() => {
          if (busy) return;
          setSafety(null);
          setConfirmed(false);
          setError(null);
        }}
        footer={null}
        closable={!busy}
        keyboard={!busy}
        mask={{ closable: !busy }}
        destroyOnHidden
        centered
      >
        {safety ? (
          <div className={styles.modalBody}>
            <Alert
              type="warning"
              showIcon
              title="Review the following warnings before handling this order"
            />
            {safety.warnings.allergyNote?.trim() ? (
              <p className={styles.allergyNote}>
                <strong>Guest allergy note:</strong> {safety.warnings.allergyNote}
              </p>
            ) : null}
            {safety.warnings.itemAllergens.length > 0 ? (
              <div>
                <strong>Item allergens:</strong>
                <ul>
                  {safety.warnings.itemAllergens.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {safety.warnings.dietaryLabels.length > 0 ? (
              <div>
                <strong>Dietary labels:</strong>
                <ul>
                  {safety.warnings.dietaryLabels.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className={styles.disclaimer}>
              Missing allergen information does not guarantee an allergen-free dish.
            </p>
            <Checkbox
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            >
              I have reviewed these warnings and will follow kitchen safety procedures.
            </Checkbox>
            <div className={styles.modalActions}>
              <Button disabled={busy} onClick={() => setSafety(null)}>
                Cancel
              </Button>
              <Button
                type="primary"
                disabled={!confirmed || busy}
                loading={busy}
                onClick={() => void acknowledgeAndStart()}
              >
                Acknowledge and start
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
