import { createHash } from 'node:crypto';

import { ConflictException } from '@nestjs/common';
import { categoryMealPeriod } from '../../integration/meal-period.js';

import type { MealCategory } from '../menu-categories/entities/meal-category.entity.js';
import type { MenuItem } from '../menu/entities/menu-item.entity.js';
import type { FoodOrder } from './entities/food-order.entity.js';
import type { OrderIntakeInput } from './order-intake.validation.js';

/**
 * Version-5 UUID deterministically derived from a caller-generated, random
 * idempotency key. This reuses the existing kms_food_orders primary key as
 * the durable idempotency boundary, without inventing new schema columns.
 */
const namespace = Buffer.from('5f8e071d52964913baf86dd11b1204ab', 'hex');
export function stableOrderId(idempotencyKey: string): string {
  const hex = createHash('sha1')
    .update(namespace)
    .update(Buffer.from(idempotencyKey, 'utf8'))
    .digest('hex');
  const variant = (8 + (Number.parseInt(hex.charAt(16), 16) % 4)).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Compares original request data, not mutable menu prices or order status. */
export function assertSameOriginalRequest(
  order: FoodOrder,
  payload: OrderIntakeInput,
): void {
  if (
    order.bookingId !== payload.bookingId ||
    order.roomNumber !== payload.roomNumber ||
    order.mealPeriod !== payload.mealPeriod ||
    (order.allergyNote ?? null) !== payload.allergyNote ||
    order.items?.length !== payload.items.length
  ) {
    throw new ConflictException(
      'Idempotency key was used for a different order',
    );
  }
  const originalItems = new Map(
    (order.items ?? []).map((item) => [item.menuItemId, item]),
  );
  payload.items.forEach((item) => {
    const original = originalItems.get(item.menuItemId);
    if (
      !original ||
      original.quantity !== item.quantity ||
      (original.specialNote ?? null) !== item.specialNote
    ) {
      throw new ConflictException(
        'Idempotency key was used for a different order',
      );
    }
  });
}

function toTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? '0');
  if (hour > 23 || minute > 59 || second > 59) return null;
  return hour * 3600 + minute * 60 + second;
}

/** Same-day start inclusive, cutoff exclusive, interpreted in Asia/Colombo. */
export function isCategoryOrderingOpen(
  category: MealCategory,
  now: Date,
): boolean {
  if (category.orderingEnabled === false) return false;
  const start = toTime(category.orderStartTime);
  const cutoff = toTime(category.orderCutoffTime);
  if (start === null || cutoff === null || cutoff <= start) return false;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? NaN);
  const hotelSecond =
    value('hour') * 3600 + value('minute') * 60 + value('second');
  return (
    Number.isFinite(hotelSecond) && hotelSecond >= start && hotelSecond < cutoff
  );
}

export function matchesMealPeriod(
  menuItem: MenuItem,
  mealPeriod: string,
): boolean {
  const label = categoryMealPeriod(menuItem.category?.name);
  return label === mealPeriod;
}
