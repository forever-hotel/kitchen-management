import { render, screen } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';

import {
  MENU_CATEGORIES_FIXTURE,
  MENU_ITEMS_FIXTURE,
} from '../../../../tests/fixtures/kms-menu.fixture';
import { MenuManagementScreen } from '..';

describe('R-01 menu feature entry point', () => {
  it('TC-KMS-R01-04: Given typed sample categories and items, when rendered, then menu screen displays their counts', () => {
    render(
      <AppProviders>
        <MenuManagementScreen categories={MENU_CATEGORIES_FIXTURE} items={MENU_ITEMS_FIXTURE} />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: 'Menu Management' })).toBeInTheDocument();
    expect(screen.getByText('Feature scaffold')).toBeInTheDocument();
    expect(screen.getByText('Categories: 4; menu items: 4.')).toBeInTheDocument();
  });
});
