import { jest } from '@jest/globals';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { KmsManagerReadGuard } from '../../common/guards/kms-manager-read.guard.js';
import { MenuController } from './menu.controller.js';
import type { MenuItem } from './entities/menu-item.entity.js';
import { MenuItemStockStatus } from './enums/menu-item-stock-status.enum.js';
import { validateMenuItemUpdate } from './menu-item-write.validation.js';
import { MenuService } from './menu.service.js';
import { MenuItemRepository } from './repositories/menu-item.repository.js';

const menuItemId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const saved = {
  menuItemId,
  categoryId,
  name: 'Rice',
  description: null,
  price: 800,
  preparationTime: 12,
  portionLimit: 3,
  imageUrl: null,
  stockStatus: MenuItemStockStatus.AVAILABLE,
  category: { categoryId, name: 'Lunch' },
  allergens: [
    { allergenId: '33333333-3333-4333-8333-333333333333', name: 'Soy' },
  ],
  dietaryLabels: [
    { dietaryLabelId: '44444444-4444-4444-8444-444444444444', name: 'Halal' },
  ],
} as MenuItem;

function controller() {
  const updateItem = jest.fn(
    async (id: string, patch: { stockStatus?: MenuItemStockStatus }) => {
      if (id !== menuItemId) return null;
      return {
        ...saved,
        stockStatus: patch.stockStatus ?? saved.stockStatus,
      } as MenuItem;
    },
  );
  const getItem = jest.fn(async (id: string) =>
    id === menuItemId ? saved : null,
  );
  const repo = {
    updateItem,
    findById: getItem,
  } as unknown as MenuItemRepository;
  const service = new MenuService(repo);
  return { controller: new MenuController(service), updateItem, getItem };
}

describe('R-10 stock PATCH and non-destructive removal contract', () => {
  it.each(Object.values(MenuItemStockStatus))(
    'TC-KMS-R10-API-01: %s is validated and persisted with tags unchanged',
    async (status) => {
      const { controller: api, updateItem } = controller();
      expect(validateMenuItemUpdate({ stockStatus: status })).toEqual({
        stockStatus: status,
      });
      const response = await api.updateItem(menuItemId, {
        stockStatus: status,
      });
      expect(response.stockStatus).toBe(status);
      expect(response.allergens).toHaveLength(1);
      expect(response.dietaryLabels).toHaveLength(1);
      expect(updateItem).toHaveBeenCalledWith(menuItemId, {
        stockStatus: status,
      });
    },
  );

  it('TC-KMS-R10-API-02: unknown menu UUID yields 404 and no item is saved', async () => {
    const { controller: api } = controller();
    await expect(
      api.updateItem('99999999-9999-4999-8999-999999999999', {
        stockStatus: 'AVAILABLE',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-KMS-R10-API-03: permanent delete always returns 409 for a known item and never touches history', async () => {
    const { controller: api, updateItem } = controller();
    await expect(api.deleteItem(menuItemId)).rejects.toThrow(ConflictException);
    expect(updateItem).not.toHaveBeenCalled();
  });

  it('TC-KMS-R10-API-04: deleting an unknown item returns 404, never a success', async () => {
    const { controller: api } = controller();
    await expect(
      api.deleteItem('99999999-9999-4999-8999-999999999999'),
    ).rejects.toThrow(NotFoundException);
  });

  it('TC-KMS-R10-API-05: unprivileged Kitchen Staff receives 403 from the real manager guard', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          sub: 'staff-123',
          role: 'KITCHEN_STAFF',
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          passwordChangeRequired: false,
        }),
        { status: 200 },
      ),
    );
    try {
      const guard = new KmsManagerReadGuard({
        get: () => 'http://localhost:8080/auth/session',
      } as unknown as ConfigService);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: 'Bearer abc.def.ghi' },
          }),
        }),
      } as unknown as ExecutionContext;
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
