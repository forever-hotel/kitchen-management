import { BadRequestException } from '@nestjs/common';

import { validateOrderIntake } from './order-intake.validation.js';

const base = {
  idempotencyKey: '6d8e0fd2-168e-4d76-a1be-819eb45f8fc2',
  bookingId: 'c5a5bd87-fad8-482c-998f-e1d7e8777a4a',
  roomNumber: '204',
  mealPeriod: 'LUNCH',
  allergyNote: 'No peanuts',
  items: [{ menuItemId: 'a40a5396-cce2-4050-b46b-7ff83f37c70e', quantity: 2 }],
};

describe('DDP-263 Order Intake request validation', () => {
  it('normalizes valid payload fields and nullable notes', () => {
    expect(validateOrderIntake(base)).toMatchObject({
      bookingId: base.bookingId,
      mealPeriod: 'LUNCH',
      allergyNote: 'No peanuts',
      items: [{ quantity: 2, specialNote: null }],
    });
  });

  it('rejects unknown client-controlled fields', () => {
    expect(() => validateOrderIntake({ ...base, totalAmount: 1 })).toThrow(
      BadRequestException,
    );
    expect(() => validateOrderIntake({ ...base, status: 'READY' })).toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid UUID, quantity and duplicate menu item', () => {
    expect(() =>
      validateOrderIntake({ ...base, bookingId: 'not-a-uuid' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateOrderIntake({
        ...base,
        items: [{ ...base.items[0], quantity: 0 }],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateOrderIntake({ ...base, items: [base.items[0], base.items[0]] }),
    ).toThrow(BadRequestException);
  });
});
