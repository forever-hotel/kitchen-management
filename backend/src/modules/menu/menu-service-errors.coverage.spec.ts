import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';

import type { MenuItem } from './entities/menu-item.entity.js';
import { MenuItemStockStatus } from './enums/menu-item-stock-status.enum.js';
import { MenuService } from './menu.service.js';
import type { MenuItemRepository } from './repositories/menu-item.repository.js';

const categoryId = '22222222-2222-4222-8222-222222222222';
const itemId = '11111111-1111-4111-8111-111111111111';
const item = {
  menuItemId: itemId,
  categoryId,
  category: { categoryId, name: 'Lunch' },
  name: 'Egg Fried Rice',
  description: null,
  price: 1200,
  preparationTime: 15,
  portionLimit: 5,
  imageUrl: null,
  stockStatus: MenuItemStockStatus.AVAILABLE,
  allergens: [],
  dietaryLabels: [],
} as MenuItem;
const createInput = {
  categoryId,
  name: item.name,
  description: null,
  price: 1200,
  preparationTime: 15,
  portionLimit: 5,
  imageUrl: null,
  stockStatus: MenuItemStockStatus.AVAILABLE,
  allergenIds: [],
  dietaryLabelIds: [],
};

function harness() {
  const createItem = jest.fn(async (): Promise<MenuItem> => item);
  const updateItem = jest.fn(async (): Promise<MenuItem | null> => item);
  const repository = { createItem, updateItem };
  return {
    service: new MenuService(repository as unknown as MenuItemRepository),
    createItem,
    updateItem,
  };
}
function constraint(code: string, name: string) {
  return new QueryFailedError('INSERT', [], { code, constraint: name });
}

describe('Menu write service: trusted PostgreSQL constraint translation', () => {
  it('creates a valid menu item and returns its resolved category and labels', async () => {
    const f = harness();
    await expect(f.service.createItem(createInput)).resolves.toMatchObject({
      menuItemId: itemId,
      category: { name: 'Lunch' },
      allergens: [],
      dietaryLabels: [],
    });
    expect(f.createItem).toHaveBeenCalledTimes(1);
  });

  it('updates an existing item while returning a mapped response', async () => {
    const f = harness();
    await expect(
      f.service.updateItem(itemId, { stockStatus: 'LOW_STOCK' }),
    ).resolves.toMatchObject({ menuItemId: itemId });
    expect(f.updateItem).toHaveBeenCalledWith(itemId, {
      stockStatus: 'LOW_STOCK',
    });
  });

  it('returns not found for an item that disappeared during PATCH', async () => {
    const f = harness();
    f.updateItem.mockResolvedValue(null);
    await expect(
      f.service.updateItem(itemId, { stockStatus: 'LOW_STOCK' }),
    ).rejects.toThrow(NotFoundException);
  });

  it.each(['create', 'update'] as const)(
    'maps the category/name unique constraint into 409 on %s',
    async (operation) => {
      const f = harness();
      const error = constraint('23505', 'uq_menu_item_category_name');
      if (operation === 'create') {
        f.createItem.mockRejectedValueOnce(error);
        await expect(f.service.createItem(createInput)).rejects.toThrow(
          ConflictException,
        );
      } else {
        f.updateItem.mockRejectedValueOnce(error);
        await expect(
          f.service.updateItem(itemId, { name: 'Egg Fried Rice' }),
        ).rejects.toThrow(ConflictException);
      }
    },
  );

  it.each([
    'kms_menu_items_category_id_fkey',
    'kms_menu_item_allergens_allergen_id_fkey',
    'kms_menu_item_dietary_labels_dietary_label_id_fkey',
  ])('maps removed referenced category/tag %s into 404', async (name) => {
    const f = harness();
    f.createItem.mockRejectedValueOnce(constraint('23503', name));
    await expect(f.service.createItem(createInput)).rejects.toThrow(
      NotFoundException,
    );
  });

  it.each([
    'kms_menu_items_price_check',
    'kms_menu_items_preparation_time_check',
    'kms_menu_items_portion_limit_check',
  ])(
    'maps trusted positive-integer constraint %s into bad request',
    async (name) => {
      const f = harness();
      f.createItem.mockRejectedValueOnce(constraint('23514', name));
      await expect(f.service.createItem(createInput)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('does not hide an unexpected database failure as a known constraint violation', async () => {
    const f = harness();
    const error = constraint('08006', 'unknown_connection_failure');
    f.createItem.mockRejectedValueOnce(error);
    await expect(f.service.createItem(createInput)).rejects.toBe(error);
  });
});
