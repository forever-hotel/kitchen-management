import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { QueryFailedError } from 'typeorm';

import { MenuService } from './menu.service.js';
import { MenuItemRepository } from './repositories/menu-item.repository.js';

const categoryId = '11111111-1111-4111-8111-111111111111';
const menuItemId = '22222222-2222-4222-8222-222222222222';
const create = { categoryId, name: 'Rice', price: 850, preparationTime: 20 };
function conflictError(): QueryFailedError {
  return new QueryFailedError('INSERT INTO kms_menu_items', [], {
    code: '23505',
    constraint: 'uq_menu_item_category_name',
  });
}

describe('R-07 service maps race-safe PostgreSQL constraints', () => {
  it('maps concurrent same-category/name insert into 409', async () => {
    const repository = {
      createItem: jest.fn(async () => { throw conflictError(); }),
    } as unknown as MenuItemRepository;
    const service = new MenuService(repository);
    await expect(service.createItem(create)).rejects.toThrow(ConflictException);
  });

  it('maps concurrent same-category/name update into 409', async () => {
    const repository = {
      updateItem: jest.fn(async () => { throw conflictError(); }),
    } as unknown as MenuItemRepository;
    const service = new MenuService(repository);
    await expect(service.updateItem(menuItemId, { name: 'Rice' })).rejects.toThrow(ConflictException);
  });
});
