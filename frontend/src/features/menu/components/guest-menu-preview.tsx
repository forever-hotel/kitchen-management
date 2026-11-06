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

/** Presentation only. This does not publish a menu item to FOSS or another guest API. */
export function GuestMenuPreview({
  draft,
  categories,
  allergens,
  dietaryLabels,
  preservedAllergens = [],
  preservedDietaryLabels = [],
}: GuestMenuPreviewProps) {
  const image = normalizeMenuImageUrl(draft.imageUrl);
  const category =
    categories.find((item) => item.categoryId === draft.categoryId)?.name ?? 'Meal category';
  const chosenAllergens = allergens.filter((tag) => draft.allergenIds.includes(tag.allergenId));
  const chosenDietary = dietaryLabels.filter((tag) =>
    draft.dietaryLabelIds.includes(tag.dietaryLabelId),
  );

  return (
    <section className={styles.guestPreview} aria-label="Guest-style menu preview">
      <div className={styles.previewEyebrow}>Guest-style preview · Not published</div>
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
      </div>
      <div className={styles.previewBody}>
        <Tag color="blue">{category}</Tag>
        <Typography.Title level={4} className={styles.previewName}>
          {draft.name.trim() || 'New menu item'}
        </Typography.Title>
        <Typography.Paragraph className={styles.previewDescription}>
          {draft.description.trim() || 'Your menu item description will appear here.'}
        </Typography.Paragraph>
        <div className={styles.previewFacts}>
          <strong>Price: {draft.price.trim() || '—'}</strong>
          <span>Prep: {draft.preparationTime.trim() || '—'} min</span>
          <span>Guest limit: {draft.portionLimit.trim() || '—'}</span>
        </div>
        <div className={styles.previewLabels} aria-label="Guest allergen and dietary labels">
          {chosenAllergens.map((tag) => (
            <Tag key={tag.allergenId} color="red">
              Allergen: {tag.name}
            </Tag>
          ))}
          {chosenDietary.map((tag) => (
            <Tag key={tag.dietaryLabelId} color="green">
              {tag.name}
            </Tag>
          ))}
          {preservedAllergens.map((name, index) => (
            <Tag key={`preserved-allergen-${index}`} color="red">
              Allergen: {name} (existing)
            </Tag>
          ))}
          {preservedDietaryLabels.map((name, index) => (
            <Tag key={`preserved-dietary-${index}`} color="green">
              {name} (existing)
            </Tag>
          ))}
          {!chosenAllergens.length &&
            !chosenDietary.length &&
            !preservedAllergens.length &&
            !preservedDietaryLabels.length && <span>No allergen or dietary labels selected</span>}
        </div>
        <p className={styles.unitDisclaimer}>
          Amounts are raw KMS integers. Currency unit awaits FOSS approval.
        </p>
      </div>
    </section>
  );
}
