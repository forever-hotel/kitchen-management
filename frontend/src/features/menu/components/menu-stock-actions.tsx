'use client';

import { Alert, Button, Modal } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';

import { KMS_MENU_STOCK_STATUSES, type KmsMenuStockStatus } from '@/types/kms-menu';

import type { MenuManagementItem } from '../types/menu-management.type';
import styles from './menu-stock-actions.module.css';

export interface MenuStockActionsProps {
  item: MenuManagementItem;
  /** True only when server-authenticated PATCH and a subsequent GET are available. */
  enabled: boolean;
  onUpdate?: (menuItemId: string, payload: { stockStatus: KmsMenuStockStatus }) => Promise<unknown>;
  onReload: () => Promise<void>;
  /** The Actions column uses the same safe-disable workflow without duplicating the select. */
  mode?: 'status' | 'remove';
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

/**
 * Compact Figma stock select + independent remove icon. Only one action appears
 * in each table cell. All writes still use the existing guarded PATCH + reload.
 * Removal always means TEMPORARILY_DISABLED and never deletes historic orders.
 */
export function MenuStockActions({
  item,
  enabled,
  onUpdate,
  onReload,
  mode = 'status',
}: MenuStockActionsProps) {
  const [selected, setSelected] = useState<KmsMenuStockStatus>(item.stockStatus);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committedStatus, setCommittedStatus] = useState<KmsMenuStockStatus | null>(null);
  const lock = useRef(false);

  const canWrite = enabled && Boolean(onUpdate);
  const blocked = !canWrite || busy || committedStatus !== null;

  async function save(next: KmsMenuStockStatus): Promise<void> {
    if (!canWrite || !onUpdate || lock.current || committedStatus !== null) return;
    if (next === item.stockStatus) {
      setSelected(item.stockStatus);
      setConfirmDisable(false);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      // Never send anything except a validated stock-status field.
      await onUpdate(item.menuItemId, { stockStatus: next });
      setCommittedStatus(next);
      setSelected(next);
      setConfirmDisable(false);
      try {
        await onReload();
      } catch {
        setError('Status saved, but the menu refresh failed. Retry the menu reload, not the update.');
      }
    } catch (failure) {
      setSelected(item.stockStatus);
      setError(safeStockError(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function changeStatus(next: KmsMenuStockStatus): void {
    if (blocked || next === item.stockStatus) return;
    setError(null);
    if (next === 'TEMPORARILY_DISABLED') {
      // Confirm before disabling an item; selection remains unchanged until success.
      setConfirmDisable(true);
      return;
    }
    setSelected(next);
    void save(next);
  }

  const confirmDialog = (
    <Modal
      title="Disable menu item instead of deleting?"
      open={confirmDisable}
      onCancel={() => {
        if (!busy) {
          setConfirmDisable(false);
          setSelected(item.stockStatus);
        }
      }}
      onOk={() => void save('TEMPORARILY_DISABLED')}
      okText="Disable item"
      okButtonProps={{ danger: true, loading: busy }}
      cancelButtonProps={{ disabled: busy }}
      closable={!busy}
      mask={{ closable: !busy }}
    >
      <p>
        This preserves the item and all existing order history. The item will be marked
        Temporarily Disabled. No menu item or past order will be deleted.
      </p>
    </Modal>
  );

  if (mode === 'remove') {
    return (
      <span className={styles.removeWrapper}>
        <Button
          className={styles.removeAction}
          icon={<DeleteOutlined aria-hidden="true" />}
          aria-label={`Remove ${item.name} safely`}
          title={canWrite ? 'Safely disable this item' : 'Manager API connection required'}
          disabled={blocked || item.stockStatus === 'TEMPORARILY_DISABLED'}
          onClick={() => setConfirmDisable(true)}
        />
        {error && <Alert type="error" role="alert" showIcon title={error} className={styles.error} />}
        {confirmDialog}
      </span>
    );
  }

  return (
    <div className={styles.controls} aria-label={`Stock actions for ${item.name}`}>
      <div className={`${styles.selectWrap} ${styles[`stock_${selected}`]}`}>
        <select
          id={`stock-${item.menuItemId}`}
          aria-label={`Stock control for ${item.name}`}
          title={canWrite ? 'Change stock status' : 'Manager API connection required'}
          value={selected}
          disabled={blocked}
          onChange={(event) => changeStatus(event.target.value as KmsMenuStockStatus)}
        >
          {KMS_MENU_STOCK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {labels[status]}
            </option>
          ))}
        </select>
      </div>
      {error && <Alert type="error" role="alert" showIcon title={error} className={styles.error} />}
      {confirmDialog}
    </div>
  );
}
