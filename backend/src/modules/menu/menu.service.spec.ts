import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { MenuItemStockStatus } from './enums/menu-item-stock-status.enum.js';
import { MenuItem } from './entities/menu-item.entity.js';
import { MenuService } from './menu.service.js';
import { MenuItemRepository } from './repositories/menu-item.repository.js';

const menuItem = {
  menuItemId: '11111111-1111-4111-8111-111111111111',
  categoryId: '22222222-2222-4222-8222-222222222222',
  name: 'Chicken Rice',
  description: 'Lunch special',
  price: 850,
  preparationTime: 20,
  portionLimit: 5,
  stockStatus: MenuItemStockStatus.LOW_STOCK,
  imageUrl: null,
  category: {
    categoryId: '22222222-2222-4222-8222-222222222222',
    name: 'Lunch',
  },
  allergens: [
    { allergenId: '33333333-3333-4333-8333-333333333333', name: 'Soy' },
  ],
  dietaryLabels: [
    { dietaryLabelId: '44444444-4444-4444-8444-444444444444', name: 'Halal' },
  ],
} as MenuItem;

describe('MenuService (R-02)', () => {
  it('TC-KMS-R02-001: Given an empty menu, when listing items, then it returns an empty array', async () => {
    const repository = {
      findAll: jest.fn<() => Promise<MenuItem[]>>().mockResolvedValue([]),
    } as unknown as MenuItemRepository;
    const service = new MenuService(repository);

    await expect(service.listItems()).resolves.toEqual([]);
  });

  it('TC-KMS-R02-002: Given a menu item and relationships, when listed, then all required fields map', async () => {
    const repository = {
      findAll: jest
        .fn<() => Promise<MenuItem[]>>()
        .mockResolvedValue([menuItem]),
    } as unknown as MenuItemRepository;
    const service = new MenuService(repository);

    await expect(service.listItems()).resolves.toEqual([
      {
        menuItemId: menuItem.menuItemId,
        categoryId: menuItem.categoryId,
        category: { categoryId: menuItem.categoryId, name: 'Lunch' },
        name: 'Chicken Rice',
        description: 'Lunch special',
        price: 850,
        preparationTime: 20,
        portionLimit: 5,
        stockStatus: MenuItemStockStatus.LOW_STOCK,
        imageUrl: null,
        allergens: [
          { allergenId: '33333333-3333-4333-8333-333333333333', name: 'Soy' },
        ],
        dietaryLabels: [
          {
            dietaryLabelId: '44444444-4444-4444-8444-444444444444',
            name: 'Halal',
          },
        ],
      },
    ]);
  });

  it('TC-KMS-R02-003: Given an item without allergens or diet labels, when mapped, then arrays are empty', async () => {
    const repository = {
      findById: jest.fn<() => Promise<MenuItem | null>>().mockResolvedValue({
        ...menuItem,
        allergens: [],
        dietaryLabels: [],
      }),
    } as unknown as MenuItemRepository;
    const service = new MenuService(repository);

    const result = await service.getItem(menuItem.menuItemId);
    expect(result.allergens).toEqual([]);
    expect(result.dietaryLabels).toEqual([]);
  });

  it('TC-KMS-R02-004: Given an unknown item, when requested, then it returns 404', async () => {
    const repository = {
      findById: jest
        .fn<() => Promise<MenuItem | null>>()
        .mockResolvedValue(null),
    } as unknown as MenuItemRepository;
    const service = new MenuService(repository);

    await expect(service.getItem(menuItem.menuItemId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('TC-KMS-R02-005: Given an item with an unloaded mandatory category, when mapped, then it fails rather than returning incorrect data', async () => {
    const repository = {
      findById: jest.fn<() => Promise<MenuItem | null>>().mockResolvedValue({
        ...menuItem,
        category: undefined,
      } as unknown as MenuItem),
    } as unknown as MenuItemRepository;
    const service = new MenuService(repository);

    await expect(service.getItem(menuItem.menuItemId)).rejects.toThrow(
      'category relation was not loaded',
    );
  });
});
