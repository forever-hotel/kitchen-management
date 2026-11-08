import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';

export interface AllergyWarningSnapshot {
  allergyNote: string | null;
  itemAllergens: string[];
  dietaryLabels: string[];
}

function sortedLabels(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  );
}

/** Catalog associations are read at acknowledgement time, not stored at order placement. */
export function buildWarningSnapshot(
  allergyNote: string | null,
  itemAllergens: readonly string[],
  dietaryLabels: readonly string[],
): AllergyWarningSnapshot {
  return {
    allergyNote: allergyNote?.trim() || null,
    itemAllergens: sortedLabels(itemAllergens),
    dietaryLabels: sortedLabels(dietaryLabels),
  };
}

/** Dietary labels are useful context, but not evidence of allergy safety. */
export function requiresAllergyAcknowledgement(
  warning: AllergyWarningSnapshot,
): boolean {
  return Boolean(warning.allergyNote) || warning.itemAllergens.length > 0;
}

export function warningFingerprint(warning: AllergyWarningSnapshot): string {
  return createHash('sha256').update(JSON.stringify(warning)).digest('hex');
}

/** Call within the *same* database transaction as the preparation state change. */
export function assertAcknowledgementForPreparation(
  required: boolean,
  acknowledged: boolean,
): void {
  if (required && !acknowledged) {
    throw new ConflictException(
      'Review and acknowledge the current allergy warnings before starting preparation',
    );
  }
}
