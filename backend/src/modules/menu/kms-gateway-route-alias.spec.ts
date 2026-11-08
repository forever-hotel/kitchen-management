import 'reflect-metadata';

import { KmsManagerReadGuard } from '../../common/guards/kms-manager-read.guard.js';
import { MenuCategoriesController } from '../menu-categories/menu-categories.controller.js';
import { MenuController } from './menu.controller.js';
import { MenuLookupsController } from './menu-lookups.controller.js';

/** The Gateway forwards /kms without stripping it. Direct API paths remain valid. */
describe('DDP-257 menu routes compatible with the unchanged API Gateway', () => {
  it.each([
    { controller: MenuController, segment: 'items' },
    { controller: MenuCategoriesController, segment: 'categories' },
    { controller: MenuLookupsController, segment: 'lookups' },
  ])(
    'registers both direct and Gateway-prefixed paths for $segment',
    ({ controller, segment }) => {
      const paths = Reflect.getMetadata('path', controller) as string[];
      expect(paths).toEqual([
        `api/v1/menu/${segment}`,
        `kms/api/v1/menu/${segment}`,
      ]);
      const guards = Reflect.getMetadata('__guards__', controller) as unknown[];
      expect(guards).toContain(KmsManagerReadGuard);
    },
  );

  it('retains the stock/item method paths and tag lookup route', () => {
    expect(
      Reflect.getMetadata('path', MenuController.prototype.updateItem),
    ).toBe(':menuItemId');
    expect(
      Reflect.getMetadata('path', MenuLookupsController.prototype.tags),
    ).toBe('tags');
  });
});
