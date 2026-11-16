import { BadRequestException } from '@nestjs/common';

import { MenuItemStockStatus } from './enums/menu-item-stock-status.enum.js';
import {
  validateMenuItemCreate,
  validateMenuItemUpdate,
} from './menu-item-write.validation.js';

const categoryId = '11111111-1111-4111-8111-111111111111';
const allergenId = '22222222-2222-4222-8222-222222222222';
const valid = {
  categoryId,
  name: '  Fried rice  ',
  price: 750,
  preparationTime: 15,
};

describe('R-07 menu-item write validation', () => {
  it('normalizes create and defaults with strict positive-integer semantics', () => {
    expect(validateMenuItemCreate(valid)).toEqual({
      categoryId,
      name: 'Fried rice',
      description: null,
      price: 750,
      preparationTime: 15,
      portionLimit: 5,
      stockStatus: MenuItemStockStatus.AVAILABLE,
      imageUrl: null,
      allergenIds: [],
      dietaryLabelIds: [],
    });
  });

  it.each([0, -1, 1.5, '750', null, 2147483648, Number.POSITIVE_INFINITY])(
    'rejects invalid price %s',
    (price) => {
      expect(() => validateMenuItemCreate({ ...valid, price })).toThrow(
        BadRequestException,
      );
    },
  );

  it.each(['preparationTime', 'portionLimit'] as const)(
    'rejects zero %s',
    (field) => {
      expect(() => validateMenuItemCreate({ ...valid, [field]: 0 })).toThrow(
        BadRequestException,
      );
    },
  );

  it('rejects unknown immutable fields, blank name, missing category and malformed UUID', () => {
    [
      { ...valid, menuItemId: categoryId },
      { ...valid, name: '    ' },
      { ...valid, categoryId: 'not-a-uuid' },
      { name: 'Rice', price: 100, preparationTime: 5 },
    ].forEach((invalid) => {
      expect(() => validateMenuItemCreate(invalid)).toThrow(
        BadRequestException,
      );
    });
  });

  it('rejects duplicate/invalid tags; allows only existing-tag reference format', () => {
    expect(() =>
      validateMenuItemCreate({
        ...valid,
        allergenIds: [allergenId, allergenId],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateMenuItemCreate({ ...valid, dietaryLabelIds: ['bad'] }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateMenuItemCreate({ ...valid, dietaryLabelIds: 'none' }),
    ).toThrow(BadRequestException);
  });

  it('rejects unsafe image protocols and invalid stock status', () => {
    expect(() =>
      validateMenuItemCreate({ ...valid, imageUrl: 'data:text/html,invalid' }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateMenuItemCreate({ ...valid, stockStatus: 'MAYBE' }),
    ).toThrow(BadRequestException);
    expect(
      validateMenuItemCreate({
        ...valid,
        imageUrl: 'https://example.org/menu.png',
      }).imageUrl,
    ).toBe('https://example.org/menu.png');
  });

  it('accepts partial PATCH, explicit nulls, and [] to clear tag links', () => {
    expect(
      validateMenuItemUpdate({
        description: null,
        imageUrl: null,
        allergenIds: [],
      }),
    ).toEqual({ description: null, imageUrl: null, allergenIds: [] });
    expect(validateMenuItemUpdate({ name: '  Dinner rice ' })).toEqual({
      name: 'Dinner rice',
    });
  });

  it('rejects empty PATCH, invalid numerical changes and immutable identifiers', () => {
    [
      {},
      { price: 0 },
      { menuItemId: categoryId },
      { allergenIds: [allergenId, allergenId] },
    ].forEach((invalid) => {
      expect(() => validateMenuItemUpdate(invalid)).toThrow(
        BadRequestException,
      );
    });
  });
});
