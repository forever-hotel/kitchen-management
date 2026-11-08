import { managerMenuRequest } from '../../menu/server/menu-management.api';
import { updateOrderingEnabled } from './ordering-windows.actions';

jest.mock('../../menu/server/menu-management.api', () => ({
  managerMenuRequest: jest.fn(),
}));

const categoryId = '22222222-2222-4222-8222-222222222222';

describe('DDP-268 availability server action', () => {
  beforeEach(() => jest.clearAllMocks());

  it('PATCHes only the explicit boolean to the manager-protected KMS route', async () => {
    jest.mocked(managerMenuRequest).mockResolvedValue({});
    await updateOrderingEnabled(categoryId, false);
    expect(managerMenuRequest).toHaveBeenCalledWith(`/categories/${categoryId}/window/enabled`, {
      method: 'PATCH',
      body: { orderingEnabled: false },
    });
  });
  it('rejects malformed input before requesting KMS', async () => {
    await expect(updateOrderingEnabled('wrong-id', false)).rejects.toThrow();
    await expect(
      updateOrderingEnabled(categoryId, 'false' as unknown as boolean),
    ).rejects.toThrow();
    expect(managerMenuRequest).not.toHaveBeenCalled();
  });
});
