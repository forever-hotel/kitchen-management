import { BadRequestException } from '@nestjs/common';

import { MenuItemStockStatus } from './enums/menu-item-stock-status.enum.js';

/** Prices are raw positive PostgreSQL integers; the FOSS currency unit is not yet agreed. */
export interface MenuItemWriteFields {
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  preparationTime: number;
  portionLimit: number;
  stockStatus: MenuItemStockStatus;
  imageUrl: string | null;
  allergenIds: string[];
  dietaryLabelIds: string[];
}

export type MenuItemPatchFields = Partial<MenuItemWriteFields>;

const acceptedFields: readonly (keyof MenuItemWriteFields)[] = [
  'categoryId',
  'name',
  'description',
  'price',
  'preparationTime',
  'portionLimit',
  'stockStatus',
  'imageUrl',
  'allergenIds',
  'dietaryLabelIds',
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PG_INT = 2147483647;

function getBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Expected a JSON object');
  }
  const body = value as Record<string, unknown>;
  const unexpectedField = Object.keys(body).find(
    (field) => !acceptedFields.includes(field as keyof MenuItemWriteFields),
  );
  if (unexpectedField !== undefined) {
    throw new BadRequestException(
      `Unexpected menu item field: ${unexpectedField}`,
    );
  }
  return body;
}

function uuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new BadRequestException(`${field} must be a valid UUID`);
  }
  return value.toLowerCase();
}

function name(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('name must be a string');
  }
  const normalized = value.trim();
  if (!normalized || [...normalized].length > 255) {
    throw new BadRequestException('name must contain 1 to 255 characters');
  }
  return normalized;
}

function positiveInteger(value: unknown, field: string): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_PG_INT
  ) {
    throw new BadRequestException(`${field} must be a positive 32-bit integer`);
  }
  return value;
}

function nullableText(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 2000) {
    throw new BadRequestException(
      `${field} must be a string of up to 2000 characters or null`,
    );
  }
  return value.trim() || null;
}

function imageUrl(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > 500) {
    throw new BadRequestException(
      'imageUrl must be an HTTP(S) URL of up to 500 characters or null',
    );
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    ) {
      throw new Error('Invalid image URL');
    }
  } catch {
    throw new BadRequestException(
      'imageUrl must be an absolute HTTP(S) URL without credentials',
    );
  }
  return trimmed;
}

function stockStatus(value: unknown): MenuItemStockStatus {
  if (
    typeof value !== 'string' ||
    !Object.values(MenuItemStockStatus).some((status) => status === value)
  ) {
    throw new BadRequestException(
      'stockStatus must be a recognized menu stock status',
    );
  }
  return value as MenuItemStockStatus;
}

function idList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new BadRequestException(
      `${field} must be an array of at most 100 UUIDs`,
    );
  }
  const ids = value.map((id: unknown) => uuid(id, field));
  if (new Set(ids).size !== ids.length) {
    throw new BadRequestException(`${field} must not contain duplicate UUIDs`);
  }
  return ids;
}

function parseField(
  field: keyof MenuItemWriteFields,
  value: unknown,
): MenuItemWriteFields[typeof field] {
  switch (field) {
    case 'categoryId':
      return uuid(value, 'categoryId');
    case 'name':
      return name(value);
    case 'description':
      return nullableText(value, 'description');
    case 'price':
    case 'preparationTime':
    case 'portionLimit':
      return positiveInteger(value, field);
    case 'stockStatus':
      return stockStatus(value);
    case 'imageUrl':
      return imageUrl(value);
    case 'allergenIds':
    case 'dietaryLabelIds':
      return idList(value, field);
    default:
      throw new BadRequestException('Unexpected menu item field');
  }
}

export function validateMenuItemCreate(value: unknown): MenuItemWriteFields {
  const body = getBody(value);
  return {
    categoryId: uuid(body.categoryId, 'categoryId'),
    name: name(body.name),
    description:
      body.description === undefined
        ? null
        : nullableText(body.description, 'description'),
    price: positiveInteger(body.price, 'price'),
    preparationTime: positiveInteger(body.preparationTime, 'preparationTime'),
    portionLimit:
      body.portionLimit === undefined
        ? 5
        : positiveInteger(body.portionLimit, 'portionLimit'),
    stockStatus:
      body.stockStatus === undefined
        ? MenuItemStockStatus.AVAILABLE
        : stockStatus(body.stockStatus),
    imageUrl: body.imageUrl === undefined ? null : imageUrl(body.imageUrl),
    allergenIds:
      body.allergenIds === undefined
        ? []
        : idList(body.allergenIds, 'allergenIds'),
    dietaryLabelIds:
      body.dietaryLabelIds === undefined
        ? []
        : idList(body.dietaryLabelIds, 'dietaryLabelIds'),
  };
}

/** Absent PATCH fields are unchanged; explicitly supplied [] clears that tag relation. */
export function validateMenuItemUpdate(value: unknown): MenuItemPatchFields {
  const body = getBody(value);
  const fields = Object.keys(body) as (keyof MenuItemWriteFields)[];
  if (!fields.length) {
    throw new BadRequestException('At least one menu item field is required');
  }
  const patch: Record<string, unknown> = {};
  fields.forEach((field) => {
    patch[field] = parseField(field, body[field]);
  });
  return patch as MenuItemPatchFields;
}
