'use client';

import { Alert, Button, Modal } from 'antd';
import { CheckOutlined, StopOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';

import { KMS_MENU_STOCK_STATUSES, type KmsMenuStockStatus } from '@/types/kms-menu';

import type { MenuManagementItem } from '../types/menu-management.type';
import styles from './menu-stock-actions.module.css';

export interface MenuStockActionsProps {
  item: MenuManagementItem;
  /** True only when both server-authenticated PATCH and a fresh server GET are available. */
  enabled: boolean;
  onUpdate?: (menuItemId: string, payload: { stockStatus: KmsMenuStockStatus }) => Promise<unknown>;
  onReload: () => Promise<void>;
}

const labels: Record<KmsMenuStockStatus, string> = {
  AVAILABLE: 'Available',
  LOW_STOCK: 'Low Stock',
  UNAVAILABLE: 'Unavailable',
  TEMPORARILY_DISABLED: 'Temporarily Disabled',
};

function safeStockError(error: unknown): string {
  const candidate = error as { status?: unknown; response?: { status?: unknown } } | null;
  const status = candidate?.status ?? candidate?.response?.status;
  switch (status) {
    case 400:
      return 'Invalid stock status. Refresh the menu and retry.';
    case 401:
      return 'Your staff session expired. Sign in again before updating stock.';
    case 403:
      return 'Only a Kitchen Manager may change menu stock.';
    case 404:
      return 'This menu item no longer exists. Refresh the menu.';
    case 409:
      return 'The stock update conflicts with current menu data. Refresh and retry.';
    default:
      return 'Stock could not be updated. Check the connection and retry.';
  }
}

/** R-10: explicitly non-destructive stock workflow. Never calls an HTTP DELETE endpoint. */
export function MenuStockActions({ item, enabled, onUpdate, onReload }: MenuStockActionsProps) {
  const [selected, setSelected] = useState<KmsMenuStockStatus>(item.stockStatus);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committedStatus, setCommittedStatus] = useState<KmsMenuStockStatus | null>(null);
  const lock = useRef(false);

  const canWrite = enabled && Boolean(onUpdate);
  const canApply = canWrite && selected !== item.stockStatus && !busy && !committedStatus;

  const save = async (next: KmsMenuStockStatus) => {
    if (!canWrite || !onUpdate || lock.current || committedStatus) return;
    if (next === item.stockStatus) {
      setConfirmDisable(false);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      // Only a validated status field is sent. Existing order references and tags remain untouched.
      await onUpdate(item.menuItemId, { stockStatus: next });
      setCommittedStatus(next);
      setConfirmDisable(false);
      // The parent owns the server reload + warning/retry when it fails.
      try {
        await onReload();
      } catch {
        setError('Status saved, but the menu refresh failed. Retry the reload, not the update.');
      }
    } catch (failure) {
      setError(safeStockError(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <div className={styles.controls} aria-label={`Stock actions for ${item.name}`}>
      <label className={styles.inputLabel} htmlFor={`stock-${item.menuItemId}`}>
        Quick status
      </label>
      <div className={styles.quickRow}>
        <select
          id={`stock-${item.menuItemId}`}
          aria-label={`Stock control for ${item.name}`}
          value={selected}
          disabled={!canWrite || busy || committedStatus !== null}
          onChange={(event) => {
            setSelected(event.target.value as KmsMenuStockStatus);
            setError(null);
          }}
        >
          {KMS_MENU_STOCK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {labels[status]}
            </option>
          ))}
        </select>
        <Button
          size="small"
          loading={busy}
          disabled={!canApply}
          onClick={() => void save(selected)}
          aria-label={`Apply stock for ${item.name}`}
          icon={<CheckOutlined aria-hidden="true" />}
        >
          Apply
        </Button>
      </div>
      <Button
        size="small"
        danger
        disabled={
          !canWrite ||
          busy ||
          committedStatus !== null ||
          item.stockStatus === 'TEMPORARILY_DISABLED'
        }
        onClick={() => setConfirmDisable(true)}
        aria-label={`Remove ${item.name} safely`}
        icon={<StopOutlined aria-hidden="true" />}
      >
        Remove
      </Button>
      {committedStatus !== null && (
        <span className={styles.note}>Saved; awaiting confirmed menu refresh.</span>
      )}
      {!canWrite && <span className={styles.note}>Manager API connection required.</span>}
      {error && <Alert type="error" showIcon title={error} className={styles.error} />}
      <Modal
        title="Disable menu item instead of deleting?"
        open={confirmDisable}
        onCancel={() => !busy && setConfirmDisable(false)}
        onOk={() => void save('TEMPORARILY_DISABLED')}
        okText="Disable item"
        okButtonProps={{ danger: true, loading: busy }}
        cancelButtonProps={{ disabled: busy }}
        closable={!busy}
        mask={{ closable: !busy }}
      >
        <p>
          This preserves the item and any existing order history. The item will be marked
          Temporarily Disabled. No menu item or past order will be deleted.
        </p>
      </Modal>
    </div>
  );
}
