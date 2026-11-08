import { ConflictException } from '@nestjs/common';

import {
  assertAcknowledgementForPreparation,
  buildWarningSnapshot,
  requiresAllergyAcknowledgement,
  warningFingerprint,
} from './allergy-safety.policy.js';

describe('DDP-260 allergy safety policy', () => {
  it('requires acknowledgement for a nonblank allergy note', () => {
    const warning = buildWarningSnapshot(' Peanuts ', [], []);
    expect(warning.allergyNote).toBe('Peanuts');
    expect(requiresAllergyAcknowledgement(warning)).toBe(true);
  });

  it('requires acknowledgement for catalog allergens', () => {
    const warning = buildWarningSnapshot(null, ['Milk', 'Eggs', 'Milk'], []);
    expect(warning.itemAllergens).toEqual(['Eggs', 'Milk']);
    expect(requiresAllergyAcknowledgement(warning)).toBe(true);
  });

  it('does not treat a dietary label as proof of allergen risk or safety', () => {
    const warning = buildWarningSnapshot(null, [], ['Vegan']);
    expect(requiresAllergyAcknowledgement(warning)).toBe(false);
  });

  it('hashes a normalized snapshot consistently', () => {
    const left = buildWarningSnapshot('Milk', ['Nuts', 'Eggs'], []);
    const right = buildWarningSnapshot(' Milk ', ['Eggs', 'Nuts'], []);
    expect(warningFingerprint(left)).toBe(warningFingerprint(right));
    expect(warningFingerprint(left)).toHaveLength(64);
    expect(warningFingerprint(buildWarningSnapshot('Wheat', [], []))).not.toBe(
      warningFingerprint(left),
    );
  });

  it('blocks preparation until the current warnings are acknowledged', () => {
    expect(() => assertAcknowledgementForPreparation(true, false)).toThrow(
      ConflictException,
    );
    expect(() => assertAcknowledgementForPreparation(true, true)).not.toThrow();
    expect(() =>
      assertAcknowledgementForPreparation(false, false),
    ).not.toThrow();
  });
});
