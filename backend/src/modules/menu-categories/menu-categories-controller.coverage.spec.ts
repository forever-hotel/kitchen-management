import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { MenuCategoriesController } from './menu-categories.controller.js';
import type { MenuCategoriesService } from './menu-categories.service.js';

const id = '22222222-2222-4222-8222-222222222222';
const category = {
  categoryId: id,
  name: 'Evening Tea',
  orderStartTime: '15:00:00',
  orderCutoffTime: '17:00:00',
};
const window = { ...category, timeZone: 'Asia/Colombo' };

function harness() {
  const listCategories = jest.fn(async () => [category]);
  const getOrderingWindow = jest.fn(async () => window);
  const createCategory = jest.fn(async () => category);
  const updateOrderingWindow = jest.fn(async () => window);
  const updateOrderingEnabled = jest.fn(async () => window);
  const updateCategory = jest.fn(async () => category);
  const controller = new MenuCategoriesController({
    listCategories,
    getOrderingWindow,
    createCategory,
    updateOrderingWindow,
    updateOrderingEnabled,
    updateCategory,
  } as unknown as MenuCategoriesService);
  return {
    controller,
    listCategories,
    getOrderingWindow,
    createCategory,
    updateOrderingWindow,
    updateOrderingEnabled,
    updateCategory,
  };
}

describe('Manager category HTTP adapter', () => {
  it('lists all saved categories', async () => {
    const f = harness();
    await expect(f.controller.listCategories()).resolves.toEqual([category]);
    expect(f.listCategories).toHaveBeenCalledTimes(1);
  });

  it('gets an individual ordering window', async () => {
    const f = harness();
    await expect(f.controller.getOrderingWindow(id)).resolves.toEqual(window);
    expect(f.getOrderingWindow).toHaveBeenCalledWith(id);
  });

  it('delegates category creation and preserves uniqueness errors', async () => {
    const f = harness();
    await expect(f.controller.createCategory(category)).resolves.toEqual(
      category,
    );
    expect(f.createCategory).toHaveBeenCalledWith(category);
    f.createCategory.mockRejectedValueOnce(
      new ConflictException('Duplicate category'),
    );
    await expect(f.controller.createCategory(category)).rejects.toThrow(
      ConflictException,
    );
  });

  it('forwards partial ordering-window edits and propagates missing-record errors', async () => {
    const f = harness();
    const patch = { orderStartTime: '15:30:00' };
    await expect(f.controller.updateOrderingWindow(id, patch)).resolves.toEqual(
      window,
    );
    expect(f.updateOrderingWindow).toHaveBeenCalledWith(id, patch);
    f.updateOrderingWindow.mockRejectedValueOnce(
      new NotFoundException('Missing category'),
    );
    await expect(f.controller.updateOrderingWindow(id, patch)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('uses the explicit ordering-enabled endpoint without implicitly changing times', async () => {
    const f = harness();
    const update = { orderingEnabled: false };
    await expect(
      f.controller.updateOrderingEnabled(id, update),
    ).resolves.toEqual(window);
    expect(f.updateOrderingEnabled).toHaveBeenCalledWith(id, update);
  });

  it('delegates a category edit while preserving fields absent from the PATCH', async () => {
    const f = harness();
    const patch = { name: 'Afternoon Tea' };
    await expect(f.controller.updateCategory(id, patch)).resolves.toEqual(
      category,
    );
    expect(f.updateCategory).toHaveBeenCalledWith(id, patch);
  });
});
