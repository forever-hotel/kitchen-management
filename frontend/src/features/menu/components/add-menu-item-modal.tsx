'use client';

import { Alert, Button, Checkbox, Input, Modal } from 'antd';
import { useState } from 'react';

import type { KmsMealCategoryData, KmsMenuStockStatus } from '@/types/kms-menu';

import type { MenuManagementItem } from '../types/menu-management.type';
import type {
  MenuAllergenOption,
  MenuDietaryLabelOption,
  MenuItemDraft,
  MenuItemWritePayload,
} from '../utils/menu-item-write.validation';
import { menuItemDraftToPayload, validateMenuItemDraft } from '../utils/menu-item-write.validation';
import { GuestMenuPreview } from './guest-menu-preview';
import styles from './menu-item-modal.module.css';

interface AddMenuItemModalProps {
  open: boolean;
  categories: readonly KmsMealCategoryData[];
  initialCategoryId?: string;
  item?: MenuManagementItem | null;
  allergens: readonly MenuAllergenOption[];
  dietaryLabels: readonly MenuDietaryLabelOption[];
  onCancel: () => void;
  /** Authenticated BFF callback; absent in read-only development previews. */
  onSave?: (payload: MenuItemWritePayload) => Promise<void>;
  /** Called only once a server write succeeded, so the parent may reload. */
  onSaved: () => void;
}

const stockOptions: { value: KmsMenuStockStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
  { value: 'TEMPORARILY_DISABLED', label: 'Temporarily Disabled' },
];

function resolveAllergenId(
  tag: { name: string; allergenId?: string },
  options: readonly MenuAllergenOption[],
): string | undefined {
  return options.find(
    (option) =>
      option.allergenId === tag.allergenId || option.name.toLowerCase() === tag.name.toLowerCase(),
  )?.allergenId;
}

function resolveDietaryId(
  tag: { name: string; dietaryLabelId?: string },
  options: readonly MenuDietaryLabelOption[],
): string | undefined {
  return options.find(
    (option) =>
      option.dietaryLabelId === tag.dietaryLabelId ||
      option.name.toLowerCase() === tag.name.toLowerCase(),
  )?.dietaryLabelId;
}

function initialDraft(
  categories: readonly KmsMealCategoryData[],
  initialCategoryId: string | undefined,
  item: MenuManagementItem | null | undefined,
  allergens: readonly MenuAllergenOption[],
  dietaryLabels: readonly MenuDietaryLabelOption[],
): MenuItemDraft {
  return {
    categoryId: item?.categoryId ?? initialCategoryId ?? categories[0]?.categoryId ?? '',
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item ? String(item.price) : '',
    preparationTime: item ? String(item.preparationTime) : '',
    portionLimit: String(item?.portionLimit ?? 5),
    stockStatus: item?.stockStatus ?? 'AVAILABLE',
    imageUrl: item?.imageUrl ?? '',
    allergenIds: (item?.allergens ?? [])
      .map((tag) => resolveAllergenId(tag, allergens))
      .filter((id): id is string => Boolean(id)),
    dietaryLabelIds: (item?.dietaryLabels ?? [])
      .map((tag) => resolveDietaryId(tag, dietaryLabels))
      .filter((id): id is string => Boolean(id)),
  };
}

function saveErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const typed = error as { status?: unknown };
    switch (typed.status) {
      case 400:
        return 'Menu details were rejected. Review the entered values.';
      case 401:
        return 'Your session expired. Sign in and try again.';
      case 403:
        return 'Only Kitchen Managers can save menu items.';
      case 404:
        return 'A category or tag no longer exists. Reload the options.';
      case 409:
        return 'An item with this name already exists in the selected category.';
      default:
        break;
    }
  }
  return 'Menu item could not be saved. Your form has been preserved; please retry.';
}

/** Native controlled inputs avoid Ant Design form scheduler issues in Jest/jsdom. */
export function AddMenuItemModal({
  open,
  categories,
  initialCategoryId,
  item,
  allergens,
  dietaryLabels,
  onCancel,
  onSave,
  onSaved,
}: AddMenuItemModalProps) {
  const [draft, setDraft] = useState<MenuItemDraft>(() =>
    initialDraft(categories, initialCategoryId, item, allergens, dietaryLabels),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const editing = Boolean(item);
  // Do not silently erase relationships that the server returned without resolvable IDs.
  const unidentifiedTags = Boolean(
    item?.allergens?.some((tag) => !resolveAllergenId(tag, allergens)) ||
    item?.dietaryLabels?.some((tag) => !resolveDietaryId(tag, dietaryLabels)),
  );

  function setField<K extends keyof MenuItemDraft>(field: K, value: MenuItemDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
  }

  function toggleId(field: 'allergenIds' | 'dietaryLabelIds', id: string, checked: boolean) {
    const current = draft[field];
    setField(
      field,
      checked
        ? [...current.filter((value) => value !== id), id]
        : current.filter((value) => value !== id),
    );
  }

  async function submit() {
    if (!onSave || submitting || unidentifiedTags) return;
    const validation = validateMenuItemDraft(draft, categories, allergens, dietaryLabels);
    if (validation) {
      setErrorMessage(validation);
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await onSave(menuItemDraftToPayload(draft, categories, allergens, dietaryLabels));
      onSaved();
    } catch (cause) {
      setErrorMessage(saveErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={editing ? 'Edit Menu Item' : 'Add Menu Item'}
      open={open}
      width={1040}
      footer={null}
      destroyOnHidden
      closable={!submitting}
      mask={{ closable: !submitting }}
      keyboard={!submitting}
      onCancel={() => {
        if (!submitting) onCancel();
      }}
    >
      {!onSave && (
        <Alert
          type="info"
          showIcon
          title="Form preview only — authenticated menu saving is not connected."
          style={{ marginBottom: 14 }}
        />
      )}
      {unidentifiedTags && (
        <Alert
          type="warning"
          showIcon
          title="Existing tag IDs are missing from the available options. Refresh tags before editing to avoid losing associations."
          style={{ marginBottom: 14 }}
        />
      )}
      {errorMessage && (
        <Alert
          type="error"
          role="alert"
          showIcon
          title={errorMessage}
          style={{ marginBottom: 14 }}
        />
      )}
      <div className={styles.layout}>
        <form
          className={styles.formColumn}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="kms-item-name">Item name *</label>
              <Input
                id="kms-item-name"
                required
                maxLength={256}
                value={draft.name}
                disabled={submitting}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="e.g. Vegetable Fried Rice"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="kms-item-category">Meal category *</label>
              <select
                id="kms-item-category"
                className={styles.select}
                value={draft.categoryId}
                disabled={submitting}
                onChange={(event) => setField('categoryId', event.target.value)}
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${styles.field} ${styles.wide}`}>
              <label htmlFor="kms-item-description">Description</label>
              <Input.TextArea
                id="kms-item-description"
                maxLength={2001}
                rows={3}
                value={draft.description}
                disabled={submitting}
                onChange={(event) => setField('description', event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="kms-item-price">Price (raw integer) *</label>
              <Input
                id="kms-item-price"
                inputMode="numeric"
                value={draft.price}
                disabled={submitting}
                onChange={(event) => setField('price', event.target.value)}
                placeholder="e.g. 1650"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="kms-item-prep">Preparation minutes *</label>
              <Input
                id="kms-item-prep"
                inputMode="numeric"
                value={draft.preparationTime}
                disabled={submitting}
                onChange={(event) => setField('preparationTime', event.target.value)}
                placeholder="e.g. 20"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="kms-item-limit">Per-guest portion limit *</label>
              <Input
                id="kms-item-limit"
                inputMode="numeric"
                value={draft.portionLimit}
                disabled={submitting}
                onChange={(event) => setField('portionLimit', event.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="kms-item-stock">Stock status</label>
              <select
                id="kms-item-stock"
                className={styles.select}
                value={draft.stockStatus}
                disabled={submitting}
                onChange={(event) =>
                  setField('stockStatus', event.target.value as KmsMenuStockStatus)
                }
              >
                {stockOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${styles.field} ${styles.wide}`}>
              <label htmlFor="kms-item-image">Image URL (optional)</label>
              <Input
                id="kms-item-image"
                type="url"
                value={draft.imageUrl}
                disabled={submitting}
                onChange={(event) => setField('imageUrl', event.target.value)}
                placeholder="https://example.com/menu-item.jpg"
              />
            </div>
          </div>
          <h3 className={styles.sectionTitle}>Allergen tags</h3>
          <div role="group" aria-label="Allergen tags" className={styles.tagChoices}>
            {allergens.length ? (
              allergens.map((tag) => (
                <Checkbox
                  key={tag.allergenId}
                  checked={draft.allergenIds.includes(tag.allergenId)}
                  disabled={submitting}
                  onChange={(event) =>
                    toggleId('allergenIds', tag.allergenId, event.target.checked)
                  }
                >
                  {tag.name}
                </Checkbox>
              ))
            ) : (
              <span>No allergen options loaded.</span>
            )}
          </div>
          <h3 className={styles.sectionTitle}>Dietary labels</h3>
          <div role="group" aria-label="Dietary labels" className={styles.tagChoices}>
            {dietaryLabels.length ? (
              dietaryLabels.map((tag) => (
                <Checkbox
                  key={tag.dietaryLabelId}
                  checked={draft.dietaryLabelIds.includes(tag.dietaryLabelId)}
                  disabled={submitting}
                  onChange={(event) =>
                    toggleId('dietaryLabelIds', tag.dietaryLabelId, event.target.checked)
                  }
                >
                  {tag.name}
                </Checkbox>
              ))
            ) : (
              <span>No dietary options loaded.</span>
            )}
          </div>
          <div className={styles.actions}>
            <Button onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={!onSave || unidentifiedTags}
            >
              {editing ? 'Save Changes' : 'Save Menu Item'}
            </Button>
          </div>
        </form>
        <GuestMenuPreview
          draft={draft}
          categories={categories}
          allergens={allergens}
          dietaryLabels={dietaryLabels}
        />
      </div>
    </Modal>
  );
}
