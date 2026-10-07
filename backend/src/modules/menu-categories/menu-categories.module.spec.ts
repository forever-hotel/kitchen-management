import { MenuCategoriesModule } from './menu-categories.module.js';

describe('MenuCategoriesModule', () => {
  it('TC-KMS-MENU-016: Given the KMS module structure, when MenuCategoriesModule is loaded, then it is defined', () => {
    // Arrange / Act / Assert
    expect(MenuCategoriesModule).toBeDefined();
  });
});
