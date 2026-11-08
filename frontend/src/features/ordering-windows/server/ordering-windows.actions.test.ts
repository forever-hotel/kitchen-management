import { managerMenuRequest } from '../../menu/server/menu-management.api';

import { reloadOrderingWindows, updateOrderingWindow } from './ordering-windows.actions';

jest.mock('../../menu/server/menu-management.api', () => ({
  managerMenuRequest: jest.fn(),
}));

const categoryId = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DDP-267 authenticated ordering-window actions', () => {
  it('loads all real categories from the existing protected KMS API', async () => {
    jest.mocked(managerMenuRequest).mockResolvedValue([
      {
        categoryId,
        name: 'Dinner',
        orderStartTime: '16:30:00',
        orderCutoffTime: '19:30:00',
      },
    ]);

    await expect(reloadOrderingWindows()).resolves.toEqual([
      {
        categoryId,
        name: 'Dinner',
        orderStartTime: '16:30:00',
        orderCutoffTime: '19:30:00',
      },
    ]);
    expect(managerMenuRequest).toHaveBeenCalledWith('/categories');
  });

  it('PATCHes only changed time fields in canonical 24-hour format', async () => {
    jest.mocked(managerMenuRequest).mockResolvedValue({});
    await updateOrderingWindow(categoryId, { orderCutoffTime: '21:00' });
    expect(managerMenuRequest).toHaveBeenCalledWith(`/categories/${categoryId}/window`, {
      method: 'PATCH',
      body: { orderCutoffTime: '21:00:00' },
    });
  });

  it('rejects malformed category identifiers without an API request', async () => {
    await expect(updateOrderingWindow('not-a-uuid', { orderStartTime: '10:00' })).rejects.toThrow(
      'valid meal category ID',
    );
    expect(managerMenuRequest).not.toHaveBeenCalled();
  });

  it('rejects unsupported fields, missing changes, and invalid times', async () => {
    await expect(updateOrderingWindow(categoryId, {})).rejects.toThrow('No ordering-window');
    await expect(
      updateOrderingWindow(categoryId, { enabled: true } as unknown as Parameters<
        typeof updateOrderingWindow
      >[1]),
    ).rejects.toThrow('Unsupported ordering-window');
    await expect(updateOrderingWindow(categoryId, { orderStartTime: '24:00' })).rejects.toThrow(
      'valid ordering times',
    );
    expect(managerMenuRequest).not.toHaveBeenCalled();
  });

  it('propagates backend failures without confirming a false save', async () => {
    jest
      .mocked(managerMenuRequest)
      .mockRejectedValue(Object.assign(new Error('Conflict'), { status: 409 }));
    await expect(
      updateOrderingWindow(categoryId, { orderStartTime: '17:00:00' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
