'use client';

import { Alert, Button, Checkbox, Input, Modal, Radio } from 'antd';
import { LinkOutlined, PictureOutlined } from '@ant-design/icons';
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
import { formatCategoryTime } from '../utils/menu-management.util';
import type { MenuItemEditPayload } from '../utils/menu-item-edit.validation';
import {
  buildMenuItemEditPayload,
  resolveEditAllergens,
  resolveEditDietaryLabels,
} from '../utils/menu-item-edit.validation';
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
  /** PATCH callback; omitted associations are preserved on the R-07 server. */
  onUpdate?: (payload: MenuItemEditPayload) => Promise<void>;
  /** Called only once a server write succeeded, so the parent may reload. */
  onSaved: () => void;
}

const stockOptions: { value: KmsMenuStockStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'UNAVAILABLE', label: 'Unavailable' },
  { value: 'TEMPORARILY_DISABLED', label: 'Temporarily Disabled' },
];

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
    allergenIds: item ? resolveEditAllergens(item, allergens).ids : [],
    dietaryLabelIds: item ? resolveEditDietaryLabels(item, dietaryLabels).ids : [],
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
  if (
    error instanceof Error &&
    (error.message === 'No changes to save.' || error.message.startsWith('Reload all existing '))
  ) {
    return error.message;
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
  onUpdate,
  onSaved,
}: AddMenuItemModalProps) {
  const [draft, setDraft] = useState<MenuItemDraft>(() =>
    initialDraft(categories, initialCategoryId, item, allergens, dietaryLabels),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const editing = Boolean(item);
  const unknownAllergens = item ? resolveEditAllergens(item, allergens).unresolved : [];
  const unknownDietary = item ? resolveEditDietaryLabels(item, dietaryLabels).unresolved : [];
  const unidentifiedTags = unknownAllergens.length > 0 || unknownDietary.length > 0;
  const canSubmit = editing ? Boolean(onUpdate) : Boolean(onSave);
  const activeCategory = categories.find((category) => category.categoryId === draft.categoryId);
  const categoryLabel = activeCategory?.name ?? 'Meal category';
  const windowLabel = activeCategory
    ? `${formatCategoryTime(activeCategory.orderStartTime)} – ${formatCategoryTime(activeCategory.orderCutoffTime)}`
    : null;
  const heading = editing ? 'Edit Menu Item' : 'Add Menu Item';
  const stockHeading = editing ? 'Stock status' : 'Initial stock status';

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
    if (!canSubmit || submitting) return;
    const validation = validateMenuItemDraft(draft, categories, allergens, dietaryLabels);
    if (validation) {
      setErrorMessage(validation);
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      if (item && onUpdate) {
        const patch = buildMenuItemEditPayload(item, draft, categories, allergens, dietaryLabels);
        await onUpdate(patch);
      } else if (!item && onSave) {
        await onSave(menuItemDraftToPayload(draft, categories, allergens, dietaryLabels));
      } else {
        return;
      }
      onSaved();
    } catch (cause) {
      setErrorMessage(saveErrorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={heading}
      open={open}
      width={1180}
      footer={null}
      destroyOnHidden
      closable={!submitting}
      mask={{ closable: !submitting }}
      keyboard={!submitting}
      classNames={{
        container: styles.modalContainer,
        header: styles.modalHeader,
        body: styles.modalBody,
        close: styles.modalClose,
      }}
      onCancel={() => {
        if (!submitting) onCancel();
      }}
    >
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <span>Menu Management</span>
        <span aria-hidden="true">›</span>
        <span>{categoryLabel}</span>
        <span aria-hidden="true">›</span>
        <strong>{editing ? 'Edit Item' : 'Add New Item'}</strong>
      </nav>
      <div className={styles.page}>
        {(!canSubmit || unidentifiedTags || errorMessage) && (
          <div className={styles.alerts}>
            {!canSubmit && (
              <Alert
                type="info"
                showIcon
                title="Form preview only — authenticated menu saving is not connected."
              />
            )}
            {unidentifiedTags && (
              <Alert
                type="warning"
                showIcon
                title="Some existing tags are unavailable. Their server associations will remain unchanged; reload tag options to edit tags."
              />
            )}
            {errorMessage && <Alert type="error" role="alert" showIcon title={errorMessage} />}
          </div>
        )}
        <div className={styles.layout}>
          <form
            className={styles.formCard}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <header className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{heading}</h2>
              <p className={styles.cardSubtitle}>
                {editing ? 'Editing in' : 'Adding to'}: {categoryLabel}
                {windowLabel ? ` · Ordering window: ${windowLabel}` : ''}
              </p>
            </header>
            <div className={styles.cardBody}>
              <section className={styles.section}>
                <h3 id="kms-section-basic" className={styles.sectionTitle}>
                  Basic information
                </h3>
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
                </div>
              </section>

              <section className={styles.section}>
                <h3 id="kms-section-pricing" className={styles.sectionTitle}>
                  Pricing &amp; preparation
                </h3>
                <div className={styles.formGrid}>
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
                    <span className={styles.hint}>Whole-number value as stored</span>
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
                    <span className={styles.hint}>Used to calculate estimated delivery time</span>
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
                    <span className={styles.hint}>Max quantity per guest per order</span>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="kms-item-calories">Calories (kcal)</label>
                    <Input
                      id="kms-item-calories"
                      inputMode="numeric"
                      disabled
                      placeholder="Not stored yet"
                    />
                    <span className={styles.hint}>Not yet supported by the menu API</span>
                  </div>
                </div>
              </section>

              <section className={styles.section}>
                <h3 id="kms-section-allergens" className={styles.sectionTitle}>
                  Allergen tags
                </h3>
                <div role="group" aria-label="Allergen tags" className={styles.tagChoices}>
                  {allergens.length ? (
                    allergens.map((tag) => (
                      <Checkbox
                        key={tag.allergenId}
                        checked={draft.allergenIds.includes(tag.allergenId)}
                        disabled={submitting || unidentifiedTags}
                        onChange={(event) =>
                          toggleId('allergenIds', tag.allergenId, event.target.checked)
                        }
                      >
                        {tag.name}
                      </Checkbox>
                    ))
                  ) : (
                    <span className={styles.hint}>No allergen options loaded.</span>
                  )}
                </div>
              </section>

              <section className={styles.section}>
                <h3 id="kms-section-dietary" className={styles.sectionTitle}>
                  Dietary labels
                </h3>
                <div role="group" aria-label="Dietary labels" className={styles.tagChoices}>
                  {dietaryLabels.length ? (
                    dietaryLabels.map((tag) => (
                      <Checkbox
                        key={tag.dietaryLabelId}
                        checked={draft.dietaryLabelIds.includes(tag.dietaryLabelId)}
                        disabled={submitting || unidentifiedTags}
                        onChange={(event) =>
                          toggleId('dietaryLabelIds', tag.dietaryLabelId, event.target.checked)
                        }
                      >
                        {tag.name}
                      </Checkbox>
                    ))
                  ) : (
                    <span className={styles.hint}>No dietary options loaded.</span>
                  )}
                </div>
              </section>

              <section className={styles.section}>
                <h3 id="kms-item-stock-heading" className={styles.sectionTitle}>
                  {stockHeading}
                </h3>
                <Radio.Group
                  className={styles.stockGroup}
                  aria-labelledby="kms-item-stock-heading"
                  name="kms-item-stock"
                  value={draft.stockStatus}
                  disabled={submitting}
                  onChange={(event) =>
                    setField('stockStatus', event.target.value as KmsMenuStockStatus)
                  }
                >
                  {stockOptions.map((status) => (
                    <Radio
                      key={status.value}
                      value={status.value}
                      className={`${styles.stockOption} ${styles[`stock_${status.value}`]}`}
                    >
                      {status.label}
                    </Radio>
                  ))}
                </Radio.Group>
              </section>

              <section className={styles.section}>
                <h3 id="kms-section-image" className={styles.sectionTitle}>
                  Item image
                </h3>
                <div className={styles.dropzone}>
                  <PictureOutlined aria-hidden="true" className={styles.dropzoneIcon} />
                  <label htmlFor="kms-item-image" className={styles.dropzoneTitle}>
                    Image URL (optional)
                  </label>
                  <Input
                    id="kms-item-image"
                    type="url"
                    className={styles.dropzoneInput}
                    prefix={<LinkOutlined aria-hidden="true" />}
                    value={draft.imageUrl}
                    disabled={submitting}
                    onChange={(event) => setField('imageUrl', event.target.value)}
                    placeholder="https://example.com/menu-item.jpg"
                  />
                  <span className={styles.hint}>
                    Paste a public http(s) image link · File upload is not yet supported
                  </span>
                </div>
              </section>
            </div>
            <footer className={styles.actions}>
              <Button onClick={onCancel} disabled={submitting}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting} disabled={!canSubmit}>
                {editing ? 'Save Changes' : 'Save Menu Item'}
              </Button>
            </footer>
          </form>
          <GuestMenuPreview
            draft={draft}
            categories={categories}
            allergens={allergens}
            dietaryLabels={dietaryLabels}
            preservedAllergens={unknownAllergens}
            preservedDietaryLabels={unknownDietary}
          />
        </div>
      </div>
    </Modal>
  );
}
