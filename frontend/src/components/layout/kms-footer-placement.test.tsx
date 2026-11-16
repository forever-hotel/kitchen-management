import { render, screen, within } from '@testing-library/react';

const mockPathname = jest.fn(() => '/menu-management');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ replace: jest.fn() }),
}));

import { AppProviders } from '@/providers/app-providers';
import { MenuManagementScreen } from '@/features/menu/components/menu-management-screen';
import { KmsShell } from './kms-shell';

describe('DDP-274 menu/sidebar/footer ownership', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/menu-management');
  });

  it('renders one shared footer inside the menu right column, not after the sidebar grid', () => {
    render(
      <AppProviders>
        <KmsShell role="KITCHEN_MANAGER">
          <MenuManagementScreen categories={[]} items={[]} />
        </KmsShell>
      </AppProviders>,
    );

    const footer = screen.getByRole('contentinfo');
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
    expect(footer.parentElement?.parentElement).toHaveAttribute(
      'aria-labelledby',
      'menu-management-heading',
    );
    expect(
      screen.getByRole('complementary', { name: 'Meal category sidebar' }),
    ).toBeInTheDocument();
    expect(within(footer).queryByRole('link')).not.toBeInTheDocument();
    expect(within(footer).getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
  });

  it('renders the shared footer for non-menu workspaces too', () => {
    mockPathname.mockReturnValue('/order-queue');
    render(
      <AppProviders>
        <KmsShell role="KITCHEN_STAFF">
          <span>Orders area</span>
        </KmsShell>
      </AppProviders>,
    );

    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass('kms-shell__footer');
    expect(footer.parentElement).toHaveClass('kms-shell');
  });
});
