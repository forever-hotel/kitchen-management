import { ConflictException } from '@nestjs/common';

import { MealCategory } from '../menu-categories/entities/meal-category.entity.js';
import { FoodOrder } from './entities/food-order.entity.js';
import { FoodOrderMealPeriod } from './enums/food-order-meal-period.enum.js';
import {
  assertSameOriginalRequest,
  isCategoryOrderingOpen,
  stableOrderId,
} from './order-intake-logic.js';
import { validateOrderIntake } from './order-intake.validation.js';

const payload = validateOrderIntake({
  idempotencyKey: '6d8e0fd2-168e-4d76-a1be-819eb45f8fc2',
  bookingId: 'c5a5bd87-fad8-482c-998f-e1d7e8777a4a',
  roomNumber: '204',
  mealPeriod: FoodOrderMealPeriod.LUNCH,
  allergyNote: null,
  items: [
    {
      menuItemId: 'a40a5396-cce2-4050-b46b-7ff83f37c70e',
      quantity: 2,
      specialNote: null,
    },
  ],
});

describe('DDP-263 durable idempotency and ordering time', () => {
  it('derives the same valid UUID for identical key retries', () => {
    expect(stableOrderId(payload.idempotencyKey)).toBe(
      stableOrderId(payload.idempotencyKey),
    );
    expect(stableOrderId(payload.idempotencyKey)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(stableOrderId('00000000-0000-4000-8000-000000000001')).not.toBe(
      stableOrderId(payload.idempotencyKey),
    );
  });

  it('distinguishes a safe replay from a conflicting changed request', () => {
    const saved = {
      bookingId: payload.bookingId,
      roomNumber: payload.roomNumber,
      mealPeriod: payload.mealPeriod,
      allergyNote: null,
      items: payload.items,
    } as FoodOrder;
    expect(() => assertSameOriginalRequest(saved, payload)).not.toThrow();
    expect(() =>
      assertSameOriginalRequest(saved, { ...payload, roomNumber: '999' }),
    ).toThrow(ConflictException);
    expect(() =>
      assertSameOriginalRequest(saved, {
        ...payload,
        items: [{ ...payload.items[0], quantity: 3 }],
      }),
    ).toThrow(ConflictException);
  });

  it('enforces Colombo time opening inclusive and cutoff exclusive', () => {
    const category = {
      orderStartTime: '11:30:00',
      orderCutoffTime: '14:30:00',
    } as MealCategory;
    expect(
      isCategoryOrderingOpen(category, new Date('2026-11-08T06:00:00.000Z')),
    ).toBe(true);
    expect(
      isCategoryOrderingOpen(category, new Date('2026-11-08T09:00:00.000Z')),
    ).toBe(false);
    expect(
      isCategoryOrderingOpen(category, new Date('2026-11-08T05:59:59.000Z')),
    ).toBe(false);
  });
});
