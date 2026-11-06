'use client';

import { Image, Tag, Typography } from 'antd';
import { PictureOutlined } from '@ant-design/icons';

import type { KmsMealCategoryData } from '@/types/kms-menu';

import type {
  MenuAllergenOption,
  MenuDietaryLabelOption,
  MenuItemDraft,
} from '../utils/menu-item-write.validation';
import { normalizeMenuImageUrl } from '../utils/menu-item-write.validation';

import styles from './menu-item-modal.module.css';

interface GuestMenuPreviewProps {
  draft: MenuItemDraft;
  categories: readonly KmsMealCategoryData[];
  allergens: readonly MenuAllergenOption[];
  dietaryLabels: readonly MenuDietaryLabelOption[];
  preservedAllergens?: readonly string[];
  preservedDietaryLabels?: readonly string[];
}

const stockLabels: Record<MenuItemDraft['stockStatus'], string> = {
  AVAILABLE: 'Available',
  LOW_STOCK: 'Low Stock',
  UNAVAILABLE: 'Unavailable',
  TEMPORARILY_DISABLED: 'Temporarily Disabled',
};

/** Presentation only. This does not publish a menu item to FOSS or another guest API. */
export function GuestMenuPreview({
  draft,
  allergens,
  dietaryLabels,
  preservedAllergens = [],
  preservedDietaryLabels = [],
}: GuestMenuPreviewProps) {
  const image = normalizeMenuImageUrl(draft.imageUrl);
  const chosenAllergens = allergens.filter((tag) => draft.allergenIds.includes(tag.allergenId));
  const chosenDietary = dietaryLabels.filter((tag) =>
    draft.dietaryLabelIds.includes(tag.dietaryLabelId),
  );

  return (
    <aside className={styles.previewColumn}>
      <div className={styles.previewEyebrow}>Guest-style preview · Not published</div>
      <section className={styles.guestPreview} aria-label="Guest-style menu preview">
        <div className={styles.previewImage}>
          {image ? (
            <Image
              src={image}
              alt={`${draft.name.trim() || 'Menu item'} preview`}
              preview={false}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={styles.imagePlaceholder} role="img" aria-label="No menu image provided">
              <PictureOutlined aria-hidden="true" /> Image preview
            </div>
          )}
          <span className={styles.guestBadge}>Guest View</span>
        </div>
        <div className={styles.previewBody}>
          <Typography.Title level={4} className={styles.previewName}>
            {draft.name.trim() || 'New menu item'}
          </Typography.Title>
          <Typography.Paragraph className={styles.previewDescription}>
            {draft.description.trim() || 'Your menu item description will appear here.'}
          </Typography.Paragraph>
          <div className={styles.previewLabels} aria-label="Guest allergen and dietary labels">
            {chosenAllergens.map((tag) => (
              <Tag key={tag.allergenId} className={styles.previewTag}>
                Allergen: {tag.name}
              </Tag>
            ))}
            {chosenDietary.map((tag) => (
              <Tag key={tag.dietaryLabelId} className={styles.previewTag}>
                {tag.name}
              </Tag>
            ))}
            {preservedAllergens.map((name, index) => (
              <Tag key={`preserved-allergen-${index}`} className={styles.previewTag}>
                Allergen: {name} (existing)
              </Tag>
            ))}
            {preservedDietaryLabels.map((name, index) => (
              <Tag key={`preserved-dietary-${index}`} className={styles.previewTag}>
                {name} (existing)
              </Tag>
            ))}
            {!chosenAllergens.length &&
              !chosenDietary.length &&
              !preservedAllergens.length &&
              !preservedDietaryLabels.length && (
                <span className={styles.previewMuted}>No allergen or dietary labels selected</span>
              )}
          </div>
          <p className={styles.previewMeta}>Est. {draft.preparationTime.trim() || '—'} min prep</p>
          <strong className={styles.previewPrice}>{draft.price.trim() || '—'}</strong>
          <p className={styles.previewMuted}>Max {draft.portionLimit.trim() || '—'} per order</p>
          <div className={`${styles.previewStock} ${styles[`previewStock_${draft.stockStatus}`]}`}>
            {stockLabels[draft.stockStatus]}
          </div>
          <p className={styles.previewFootnote}>
            This is how guests will see this item in the FOSS Guest App
          </p>
          <p className={styles.unitDisclaimer}>
            Amounts are raw KMS integers. Currency unit awaits FOSS approval.
          </p>
        </div>
      </section>
    </aside>
  );
}
