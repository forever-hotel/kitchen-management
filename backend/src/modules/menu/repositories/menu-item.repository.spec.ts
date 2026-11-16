import { jest } from '@jest/globals';
import { Repository } from 'typeorm';

import { MenuItem } from '../entities/menu-item.entity.js';
import { MenuItemRepository } from './menu-item.repository.js';

const relations = { category: true, allergens: true, dietaryLabels: true };

describe('MenuItemRepository', () => {
  it('TC-KMS-MENU-014: Given persisted menu items, when all items are requested, then they are retrieved alphabetically with relationships', async () => {
    const menuItems = [
      { menuItemId: 'menu-item-1', name: 'Chicken Rice' },
    ] as MenuItem[];
    const typeOrmRepository = {
      find: jest.fn<() => Promise<MenuItem[]>>().mockResolvedValue(menuItems),
    } as unknown as Repository<MenuItem>;
    const repository = new MenuItemRepository(typeOrmRepository);

    const result = await repository.findAll();

    expect(result).toBe(menuItems);
    expect(typeOrmRepository.find).toHaveBeenCalledWith({
      relations,
      order: { name: 'ASC' },
    });
  });

  it('TC-KMS-MENU-015: Given a menu-item identifier, when requested, then its relationships are loaded', async () => {
    const menuItem = {
      menuItemId: 'menu-item-1',
      name: 'Chicken Rice',
    } as MenuItem;
    const typeOrmRepository = {
      findOne: jest
        .fn<() => Promise<MenuItem | null>>()
        .mockResolvedValue(menuItem),
    } as unknown as Repository<MenuItem>;
    const repository = new MenuItemRepository(typeOrmRepository);

    const result = await repository.findById('menu-item-1');

    expect(result).toBe(menuItem);
    expect(typeOrmRepository.findOne).toHaveBeenCalledWith({
      where: { menuItemId: 'menu-item-1' },
      relations,
    });
  });
});
