import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';

import { MealCategory } from '../../menu-categories/entities/meal-category.entity.js';
import { Allergen } from '../entities/allergen.entity.js';
import { DietaryLabel } from '../entities/dietary-label.entity.js';
import { MenuItem } from '../entities/menu-item.entity.js';
import { MenuItemStockStatus } from '../enums/menu-item-stock-status.enum.js';
import { MenuItemRepository } from './menu-item.repository.js';

const categoryId = '11111111-1111-4111-8111-111111111111';
const allergenId = '22222222-2222-4222-8222-222222222222';
const dietaryLabelId = '33333333-3333-4333-8333-333333333333';
const menuItemId = '44444444-4444-4444-8444-444444444444';
const category = { categoryId, name: 'Lunch' } as MealCategory;
const allergen = { allergenId, name: 'Soy' } as Allergen;
const dietaryLabel = { dietaryLabelId, name: 'Vegetarian' } as DietaryLabel;
const fields = {
  categoryId,
  name: 'Rice',
  description: null,
  price: 850,
  preparationTime: 20,
  portionLimit: 5,
  stockStatus: MenuItemStockStatus.AVAILABLE,
  imageUrl: null,
  allergenIds: [allergenId],
  dietaryLabelIds: [dietaryLabelId],
};

function buildRepositories({ missingAllergen = false, duplicate = false } = {}) {
  const created = {
    menuItemId,
    categoryId,
    category,
    name: 'Rice',
    description: null,
    price: 850,
    preparationTime: 20,
    portionLimit: 5,
    stockStatus: MenuItemStockStatus.AVAILABLE,
    imageUrl: null,
    allergens: [allergen],
    dietaryLabels: [dietaryLabel],
  } as MenuItem;
  const itemRepo = {
    findOne: jest.fn(async (options: { where?: { name?: string } }) => {
      if (options.where?.name) {
        return duplicate ? created : null;
      }
      return created;
    }),
    create: jest.fn((input: object) => ({ ...input, menuItemId }) as MenuItem),
    save: jest.fn(async (item: MenuItem) => item),
    merge: jest.fn((target: MenuItem, changes: Partial<MenuItem>) => Object.assign(target, changes)),
  };
  const catRepo = { findOne: jest.fn(async () => category) };
  const allergenRepo = { find: jest.fn(async () => missingAllergen ? [] : [allergen]) };
  const dietaryRepo = { find: jest.fn(async () => [dietaryLabel]) };
  const manager = {
    getRepository: (entity: unknown) => {
      if (entity === MenuItem) return itemRepo;
      if (entity === MealCategory) return catRepo;
      if (entity === Allergen) return allergenRepo;
      if (entity === DietaryLabel) return dietaryRepo;
      throw new Error('Unexpected entity');
    },
  };
  const transaction = jest.fn(async (fn: (transactionManager: EntityManager) => Promise<MenuItem | null>) =>
    fn(manager as unknown as EntityManager));
  const repository = new MenuItemRepository({
    manager: { transaction },
  } as unknown as Repository<MenuItem>);
  return { repository, transaction, itemRepo, catRepo, allergenRepo, dietaryRepo };
}

describe('R-07 MenuItemRepository transaction and tag writes', () => {
  it('TC-KMS-R07-014: creates item and two many-to-many associations in one transaction', async () => {
    const { repository, transaction, itemRepo } = buildRepositories();
    const created = await repository.createItem(fields);
    expect(created.menuItemId).toBe(menuItemId);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(itemRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Rice',
      allergens: [allergen],
      dietaryLabels: [dietaryLabel],
    }));
    expect(itemRepo.save).toHaveBeenCalledTimes(1);
  });

  it('TC-KMS-R07-015: missing allergen prevents save within the transaction', async () => {
    const { repository, itemRepo, transaction } = buildRepositories({ missingAllergen: true });
    await expect(repository.createItem(fields)).rejects.toThrow(NotFoundException);
    expect(itemRepo.save).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('TC-KMS-R07-016: duplicate category/name prevents insertion', async () => {
    const { repository, itemRepo } = buildRepositories({ duplicate: true });
    await expect(repository.createItem(fields)).rejects.toThrow(ConflictException);
    expect(itemRepo.save).not.toHaveBeenCalled();
  });

  it('TC-KMS-R07-017: PATCH first locks item, then replaces supplied tag arrays', async () => {
    const { repository, itemRepo, transaction } = buildRepositories();
    const result = await repository.updateItem(menuItemId, {
      allergenIds: [],
      dietaryLabelIds: [],
      price: 900,
    });
    expect(result).not.toBeNull();
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(itemRepo.findOne).toHaveBeenCalledWith({
      where: { menuItemId },
      lock: { mode: 'pessimistic_write' },
    });
    expect(itemRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      price: 900,
      allergens: [],
      dietaryLabels: [],
    }));
  });
});
