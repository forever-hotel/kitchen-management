import { BadRequestException } from '@nestjs/common';

import {
  validateCategoryCreate,
  validateCategoryUpdate,
} from './menu-category-write.validation.js';

const current = {
  name: 'Lunch',
  orderStartTime: '11:30:00',
  orderCutoffTime: '14:30:00',
};

describe('R-05 category write validation', () => {
  it('TC-KMS-R05-001: normalizes category name and canonicalizes valid times', () => {
    expect(
      validateCategoryCreate({
        name: '  Lunch  ',
        orderStartTime: '11:30',
        orderCutoffTime: '14:30:30',
      }),
    ).toEqual({
      name: 'Lunch',
      orderStartTime: '11:30:00',
      orderCutoffTime: '14:30:30',
    });
  });

  it('TC-KMS-R05-002: rejects empty, missing and overlength names', () => {
    ['', '   ', 'A'.repeat(101), null, 7].forEach((name) => {
      expect(() =>
        validateCategoryCreate({
          name,
          orderStartTime: '11:30',
          orderCutoffTime: '14:30',
        }),
      ).toThrow(BadRequestException);
    });
    expect(
      validateCategoryCreate({
        name: 'A'.repeat(100),
        orderStartTime: '11:30',
        orderCutoffTime: '14:30',
      }).name,
    ).toHaveLength(100);
  });

  it('TC-KMS-R05-003: rejects invalid 24-hour time and reversed or equal windows', () => {
    const badTimes = ['24:00', '11:60', '11:30:60', '11am', '11:30Z'];
    badTimes.forEach((time) => {
      expect(() =>
        validateCategoryCreate({
          name: 'Dinner',
          orderStartTime: time,
          orderCutoffTime: '22:00',
        }),
      ).toThrow(BadRequestException);
    });
    ['10:00', '11:30'].forEach((cutoff) => {
      expect(() =>
        validateCategoryCreate({
          name: 'Lunch',
          orderStartTime: '11:30',
          orderCutoffTime: cutoff,
        }),
      ).toThrow(BadRequestException);
    });
  });

  it('TC-KMS-R05-004: rejects unknown and immutable fields', () => {
    expect(() =>
      validateCategoryCreate({ ...current, categoryId: 'not-allowed' }),
    ).toThrow(BadRequestException);
    expect(() => validateCategoryUpdate({ menuItems: [] }, current)).toThrow(
      BadRequestException,
    );
    expect(() => validateCategoryUpdate({}, current)).toThrow(
      BadRequestException,
    );
    expect(() => validateCategoryCreate([])).toThrow(BadRequestException);
  });

  it('TC-KMS-R05-005: validates a partial update against the saved time boundary', () => {
    expect(
      validateCategoryUpdate({ orderCutoffTime: '15:30' }, current),
    ).toEqual({
      orderCutoffTime: '15:30:00',
    });
    expect(() =>
      validateCategoryUpdate({ orderCutoffTime: '09:00' }, current),
    ).toThrow(BadRequestException);
    expect(() => validateCategoryUpdate({ name: '  ' }, current)).toThrow(
      BadRequestException,
    );
  });
});
