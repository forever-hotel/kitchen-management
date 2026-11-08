import type { KmsMealPeriod, KmsOrderStatus } from '../../../types/kms-order';
import { isKmsMealPeriod, isKmsOrderStatus } from '../../../types/kms-order';

export interface KitchenOrderLineItem {
  orderItemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  specialNote: string | null;
}

export interface KitchenOrderDetails {
  orderId: string;
  bookingId: string;
  roomNumber: string;
  mealPeriod: KmsMealPeriod;
  status: KmsOrderStatus;
  placedAt: string;
  estimatedDeliveryTime: string | null;
  allergyNote: string | null;
  totalAmount: number;
  items: KitchenOrderLineItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseLineItem(value: unknown): KitchenOrderLineItem {
  if (
    !isRecord(value) ||
    typeof value.orderItemId !== 'string' ||
    typeof value.menuItemId !== 'string' ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    !Number.isSafeInteger(value.quantity) ||
    Number(value.quantity) <= 0 ||
    !Number.isSafeInteger(value.unitPrice) ||
    Number(value.unitPrice) < 0 ||
    !isNullableText(value.specialNote)
  ) {
    throw new Error('Invalid food-order item in API response');
  }

  return {
    orderItemId: value.orderItemId,
    menuItemId: value.menuItemId,
    name: value.name,
    quantity: value.quantity as number,
    unitPrice: value.unitPrice as number,
    specialNote: value.specialNote,
  };
}

/** Validate the service response at the trust boundary; do not invent missing fields. */
export function parseKitchenOrderDetails(value: unknown): KitchenOrderDetails {
  if (
    !isRecord(value) ||
    typeof value.orderId !== 'string' ||
    typeof value.bookingId !== 'string' ||
    typeof value.roomNumber !== 'string' ||
    !isKmsMealPeriod(value.mealPeriod) ||
    !isKmsOrderStatus(value.status) ||
    !isIsoDate(value.placedAt) ||
    !(value.estimatedDeliveryTime === null || isIsoDate(value.estimatedDeliveryTime)) ||
    !isNullableText(value.allergyNote) ||
    !Number.isSafeInteger(value.totalAmount) ||
    Number(value.totalAmount) < 0 ||
    !Array.isArray(value.items)
  ) {
    throw new Error('Invalid food-order response');
  }

  return {
    orderId: value.orderId,
    bookingId: value.bookingId,
    roomNumber: value.roomNumber,
    mealPeriod: value.mealPeriod,
    status: value.status,
    placedAt: value.placedAt,
    estimatedDeliveryTime: value.estimatedDeliveryTime,
    allergyNote: value.allergyNote,
    totalAmount: value.totalAmount as number,
    items: value.items.map(parseLineItem),
  };
}
