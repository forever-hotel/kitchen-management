import { BadRequestException } from '@nestjs/common';

import { MenuItemStockStatus } from './enums/menu-item-stock-status.enum.js';
import {
  validateMenuItemCreate,
  validateMenuItemUpdate,
} from './menu-item-write.validation.js';

const categoryId = '22222222-2222-4222-8222-222222222222';
const allergenId = 'a3333333-3333-4333-8333-33333333333a';
const dietaryLabelId = '44444444-4444-4444-8444-444444444444';
const validCreate = {
  categoryId,
  name: 'Vegetable Fried Rice',
  price: 1500,
  preparationTime: 15,
};

describe('Menu item API validation: error-path and normalization coverage', () => {
  it('applies documented defaults and preserves valid category associations', () => {
    expect(validateMenuItemCreate(validCreate)).toEqual({
      ...validCreate,
      description: null,
      portionLimit: 5,
      stockStatus: MenuItemStockStatus.AVAILABLE,
      imageUrl: null,
      allergenIds: [],
      dietaryLabelIds: [],
    });
  });

  it.each([
    ['null', null],
    ['array', []],
    ['text', 'not an object'],
    ['unknown field', { ...validCreate, internalOnly: true }],
    ['invalid category UUID', { ...validCreate, categoryId: 'bad-id' }],
    ['numeric name', { ...validCreate, name: 42 }],
    ['blank name', { ...validCreate, name: '   ' }],
    ['name too long', { ...validCreate, name: 'X'.repeat(256) }],
    ['zero price', { ...validCreate, price: 0 }],
    ['negative price', { ...validCreate, price: -1 }],
    ['decimal price', { ...validCreate, price: 10.5 }],
    ['oversized integer price', { ...validCreate, price: 2147483648 }],
    ['non-numeric prep time', { ...validCreate, preparationTime: '15' }],
    ['zero portion limit', { ...validCreate, portionLimit: 0 }],
    ['invalid stock status', { ...validCreate, stockStatus: 'SOLD_OUT' }],
    ['non-string description', { ...validCreate, description: 19 }],
    [
      'oversized description',
      { ...validCreate, description: 'x'.repeat(2001) },
    ],
    ['bad image URL', { ...validCreate, imageUrl: 'not-a-url' }],
    [
      'unsupported image protocol',
      { ...validCreate, imageUrl: 'ftp://example.com/rice.png' },
    ],
    [
      'image URL with credentials',
      { ...validCreate, imageUrl: 'https://user:pass@example.com/rice.png' },
    ],
    ['oversized image URL', { ...validCreate, imageUrl: 'x'.repeat(501) }],
    [
      'invalid allergen collection',
      { ...validCreate, allergenIds: 'incorrect' },
    ],
    ['invalid allergen UUID', { ...validCreate, allergenIds: ['bad'] }],
    [
      'duplicate allergen UUIDs',
      { ...validCreate, allergenIds: [allergenId, allergenId] },
    ],
    [
      'more than 100 dietary tags',
      { ...validCreate, dietaryLabelIds: Array(101).fill(dietaryLabelId) },
    ],
  ] as [string, unknown][])(
    'rejects %s instead of persisting invalid menu data',
    (...[, payload]: [string, unknown]) => {
      expect(() => validateMenuItemCreate(payload)).toThrow(
        BadRequestException,
      );
    },
  );

  it('normalizes optional text, URL, and UUID lists when present', () => {
    const result = validateMenuItemCreate({
      ...validCreate,
      name: '  Vegetable Fried Rice  ',
      description: '  House special  ',
      imageUrl: '  https://example.com/rice.jpg  ',
      allergenIds: [allergenId.toUpperCase()],
      dietaryLabelIds: [dietaryLabelId],
      stockStatus: MenuItemStockStatus.LOW_STOCK,
    });
    expect(result).toMatchObject({
      name: 'Vegetable Fried Rice',
      description: 'House special',
      imageUrl: 'https://example.com/rice.jpg',
      allergenIds: [allergenId],
      dietaryLabelIds: [dietaryLabelId],
      stockStatus: MenuItemStockStatus.LOW_STOCK,
    });
  });

  it('treats blank optional strings as null without mutating other fields', () => {
    expect(
      validateMenuItemCreate({
        ...validCreate,
        description: '  ',
        imageUrl: '  ',
      }),
    ).toMatchObject({ description: null, imageUrl: null });
  });

  it('keeps PATCH partial, with explicit empty tag arrays clearing associations', () => {
    expect(
      validateMenuItemUpdate({
        name: '  New name ',
        description: null,
        imageUrl: null,
        allergenIds: [],
        dietaryLabelIds: [],
      }),
    ).toEqual({
      name: 'New name',
      description: null,
      imageUrl: null,
      allergenIds: [],
      dietaryLabelIds: [],
    });
  });

  it('rejects empty PATCH, unknown keys, and invalid PATCH values', () => {
    expect(() => validateMenuItemUpdate({})).toThrow(BadRequestException);
    expect(() => validateMenuItemUpdate({ secret: true })).toThrow(
      BadRequestException,
    );
    expect(() => validateMenuItemUpdate({ preparationTime: 0 })).toThrow(
      BadRequestException,
    );
    expect(() => validateMenuItemUpdate({ stockStatus: null })).toThrow(
      BadRequestException,
    );
  });

  it('validates every supported nondefault PATCH field through the same strict rules', () => {
    expect(
      validateMenuItemUpdate({
        categoryId,
        price: 2000,
        preparationTime: 18,
        portionLimit: 3,
        stockStatus: MenuItemStockStatus.UNAVAILABLE,
        imageUrl: 'https://example.com/test.png',
        allergenIds: [allergenId],
        dietaryLabelIds: [dietaryLabelId],
      }),
    ).toMatchObject({
      categoryId,
      price: 2000,
      preparationTime: 18,
      portionLimit: 3,
      stockStatus: MenuItemStockStatus.UNAVAILABLE,
      imageUrl: 'https://example.com/test.png',
      allergenIds: [allergenId],
      dietaryLabelIds: [dietaryLabelId],
    });
  });
});
