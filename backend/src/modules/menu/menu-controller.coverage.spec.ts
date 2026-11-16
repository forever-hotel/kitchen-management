import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { MenuController } from './menu.controller.js';
import type { MenuService } from './menu.service.js';

const menuItemId = '11111111-1111-4111-8111-111111111111';
const item = {
  menuItemId,
  name: 'Egg Fried Rice',
  categoryId: '22222222-2222-4222-8222-222222222222',
};

function harness() {
  const listItems = jest.fn(async () => [item]);
  const getItem = jest.fn(async () => item);
  const createItem = jest.fn(async () => item);
  const updateItem = jest.fn(async () => item);
  const controller = new MenuController({
    listItems,
    getItem,
    createItem,
    updateItem,
  } as unknown as MenuService);
  return { controller, listItems, getItem, createItem, updateItem };
}

describe('Manager menu HTTP adapter', () => {
  it('lists database-backed menu items through the manager service', async () => {
    const f = harness();
    await expect(f.controller.listItems()).resolves.toEqual([item]);
    expect(f.listItems).toHaveBeenCalledTimes(1);
  });

  it('requests a specific item without altering the UUID', async () => {
    const f = harness();
    await expect(f.controller.getItem(menuItemId)).resolves.toEqual(item);
    expect(f.getItem).toHaveBeenCalledWith(menuItemId);
  });

  it('forwards create payload unchanged so service validation remains authoritative', async () => {
    const f = harness();
    const body = { name: 'Egg Fried Rice', categoryId: item.categoryId };
    await expect(f.controller.createItem(body)).resolves.toEqual(item);
    expect(f.createItem).toHaveBeenCalledWith(body);
  });

  it('propagates conflict without falsely claiming that the item was created', async () => {
    const f = harness();
    f.createItem.mockRejectedValueOnce(new ConflictException('Duplicate item'));
    await expect(
      f.controller.createItem({ name: 'Egg Fried Rice' }),
    ).rejects.toThrow(ConflictException);
  });

  it('forwards PATCH to the existing item without adding any omitted fields', async () => {
    const f = harness();
    const patch = { stockStatus: 'LOW_STOCK' };
    await expect(f.controller.updateItem(menuItemId, patch)).resolves.toEqual(
      item,
    );
    expect(f.updateItem).toHaveBeenCalledWith(menuItemId, patch);
  });

  it('rejects permanent deletion after checking the item exists, without a delete repository call', async () => {
    const f = harness();
    await expect(f.controller.deleteItem(menuItemId)).rejects.toThrow(
      ConflictException,
    );
    expect(f.getItem).toHaveBeenCalledWith(menuItemId);
  });

  it('returns the original not-found failure when attempting to delete an unknown item', async () => {
    const f = harness();
    f.getItem.mockRejectedValueOnce(new NotFoundException('Missing item'));
    await expect(f.controller.deleteItem(menuItemId)).rejects.toThrow(
      NotFoundException,
    );
  });
});
