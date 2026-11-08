import { isKmsMealPeriod, isKmsOrderStatus } from '../../../types/kms-order';
import type { KmsMealPeriod, KmsOrderStatus } from '../../../types/kms-order';

export interface KotPreviewItem {
  orderItemId: string;
  name: string;
  quantity: number;
  specialNote: string | null;
}

export interface KotPreview {
  mode: 'PREVIEW_ONLY';
  orderId: string;
  roomNumber: string;
  mealPeriod: KmsMealPeriod;
  status: KmsOrderStatus;
  placedAt: string;
  allergyNote: string | null;
  items: KotPreviewItem[];
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function optionalText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseItem(value: unknown): KotPreviewItem {
  if (
    !record(value) ||
    typeof value.orderItemId !== 'string' ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    !Number.isSafeInteger(value.quantity) ||
    (value.quantity as number) < 1 ||
    !optionalText(value.specialNote)
  ) {
    throw new Error('Invalid kitchen ticket item');
  }
  return {
    orderItemId: value.orderItemId,
    name: value.name,
    quantity: value.quantity as number,
    specialNote: value.specialNote,
  };
}

/** Reject fake print confirmations and malformed upstream ticket data. */
export function parseKotPreview(value: unknown): KotPreview {
  if (
    !record(value) ||
    value.mode !== 'PREVIEW_ONLY' ||
    typeof value.orderId !== 'string' ||
    typeof value.roomNumber !== 'string' ||
    !isKmsMealPeriod(value.mealPeriod) ||
    !isKmsOrderStatus(value.status) ||
    typeof value.placedAt !== 'string' ||
    Number.isNaN(Date.parse(value.placedAt)) ||
    !optionalText(value.allergyNote) ||
    !Array.isArray(value.items)
  ) {
    throw new Error('Invalid kitchen ticket preview');
  }
  return {
    mode: 'PREVIEW_ONLY',
    orderId: value.orderId,
    roomNumber: value.roomNumber,
    mealPeriod: value.mealPeriod,
    status: value.status,
    placedAt: value.placedAt,
    allergyNote: value.allergyNote,
    items: value.items.map(parseItem),
  };
}
