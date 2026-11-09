import { ApiError } from '@/lib/api/api-error';
import { createMenuItem, updateMenuItem } from './menu-management.actions';
import { managerMenuRequest } from './menu-management.api';
import type { MenuItemWritePayload } from '../utils/menu-item-write.validation';

jest.mock('./menu-management.api', () => ({ managerMenuRequest: jest.fn() }));

const menuRequest = jest.mocked(managerMenuRequest);
const payload: MenuItemWritePayload = {
  categoryId: '22222222-2222-4222-8222-222222222222',
  name: 'Egg Fried Rice',
  description: null,
  price: 1250,
  preparationTime: 15,
  portionLimit: 5,
  stockStatus: 'AVAILABLE',
  imageUrl: null,
  allergenIds: [],
  dietaryLabelIds: [],
};

describe('KMS menu write Server Action feedback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('serializes a duplicate item (409) instead of throwing through the action boundary', async () => {
    menuRequest.mockRejectedValueOnce(
      new ApiError('A menu item with this name already exists in the category', 'conflict', 409),
    );

    await expect(createMenuItem(payload)).resolves.toEqual({
      ok: false,
      status: 409,
      message: 'An item with this name already exists in the selected category.',
    });
  });

  it('does not reveal untrusted server error text on non-conflict errors', async () => {
    menuRequest.mockRejectedValueOnce(new ApiError('internal SQL details', 'server', 500));

    const result = await createMenuItem(payload);
    expect(result).toEqual({
      ok: false,
      status: 500,
      message: 'The menu service could not save this item. Please try again.',
    });
    expect(JSON.stringify(result)).not.toContain('internal SQL details');
  });

  it('returns success only when the server write actually succeeds', async () => {
    menuRequest.mockResolvedValueOnce({ menuItemId: 'sample' });
    await expect(createMenuItem(payload)).resolves.toEqual({ ok: true });
    expect(menuRequest).toHaveBeenCalledWith('/items', { method: 'POST', body: payload });
  });

  it('handles edit conflicts with the same visible result contract', async () => {
    menuRequest.mockRejectedValueOnce(new ApiError('duplicate', 'conflict', 409));
    const result = await updateMenuItem('33333333-3333-4333-8333-333333333333', {
      name: 'Egg Fried Rice',
    });
    expect(result).toMatchObject({ ok: false, status: 409 });
  });
});
