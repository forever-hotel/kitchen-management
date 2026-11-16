import { BadRequestException } from '@nestjs/common';

import { FoodOrderMealPeriod } from './enums/food-order-meal-period.enum.js';

export interface OrderIntakeItem {
  menuItemId: string;
  quantity: number;
  specialNote: string | null;
}

export interface OrderIntakeInput {
  idempotencyKey: string;
  bookingId: string;
  roomNumber: string;
  mealPeriod: FoodOrderMealPeriod;
  allergyNote: string | null;
  items: OrderIntakeItem[];
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const roomRegex = /^[a-zA-Z0-9-]{1,10}$/;
const allowedFields = [
  'idempotencyKey',
  'bookingId',
  'roomNumber',
  'mealPeriod',
  'allergyNote',
  'items',
] as const;
const allowedItemFields = ['menuItemId', 'quantity', 'specialNote'] as const;

function objectFields(
  value: unknown,
  allowed: readonly string[],
  label: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException(`${label} must be an object`);
  }
  const result = value as Record<string, unknown>;
  if (Object.keys(result).some((field) => !allowed.includes(field))) {
    throw new BadRequestException(`${label} contains unsupported fields`);
  }
  return result;
}

function uuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !uuidRegex.test(value)) {
    throw new BadRequestException(`${label} must be a UUID`);
  }
  return value.toLowerCase();
}

function note(value: unknown, label: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.length > 300) {
    throw new BadRequestException(
      `${label} must be a string of at most 300 characters`,
    );
  }
  return value.trim() || null;
}

/** Reject unknown data and normalize the exact fields that KMS persists. */
export function validateOrderIntake(payload: unknown): OrderIntakeInput {
  const body = objectFields(payload, allowedFields, 'Food order');
  const idempotencyKey = uuid(body.idempotencyKey, 'idempotencyKey');
  const bookingId = uuid(body.bookingId, 'bookingId');
  if (typeof body.roomNumber !== 'string' || !roomRegex.test(body.roomNumber)) {
    throw new BadRequestException('Invalid roomNumber');
  }
  if (
    !Object.values(FoodOrderMealPeriod).includes(
      body.mealPeriod as FoodOrderMealPeriod,
    )
  ) {
    throw new BadRequestException('Invalid mealPeriod');
  }
  if (
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > 30
  ) {
    throw new BadRequestException('items must contain 1 to 30 entries');
  }
  const seen = new Set<string>();
  let totalQuantity = 0;
  const items = body.items.map((raw: unknown) => {
    const item = objectFields(raw, allowedItemFields, 'Order item');
    const menuItemId = uuid(item.menuItemId, 'menuItemId');
    if (seen.has(menuItemId))
      throw new BadRequestException('Duplicate menuItemId');
    seen.add(menuItemId);
    if (
      typeof item.quantity !== 'number' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 50
    ) {
      throw new BadRequestException(
        'quantity must be a positive integer up to 50',
      );
    }
    totalQuantity += item.quantity;
    return {
      menuItemId,
      quantity: item.quantity,
      specialNote: note(item.specialNote, 'specialNote'),
    };
  });
  if (totalQuantity > 50)
    throw new BadRequestException('Order exceeds 50 portions');
  return {
    idempotencyKey,
    bookingId,
    roomNumber: body.roomNumber,
    mealPeriod: body.mealPeriod as FoodOrderMealPeriod,
    allergyNote: note(body.allergyNote, 'allergyNote'),
    items,
  };
}
