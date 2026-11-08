import { render, screen, within } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/order-queue',
  useRouter: () => ({ replace: jest.fn() }),
}));

import { AppProviders } from '@/providers/app-providers';
import { KmsShell } from './kms-shell';

describe('DDP-262 compact kitchen header', () => {
  it('groups logout beside the hotel clock and keeps it out of navigation', () => {
    render(
      <AppProviders>
        <KmsShell role="KITCHEN_MANAGER">
          <span>Kitchen workspace</span>
        </KmsShell>
      </AppProviders>,
    );
    const tools = screen.getByRole('group', { name: 'Hotel time and account actions' });
    expect(within(tools).getByLabelText('Current hotel time (Sri Lanka)')).toBeInTheDocument();
    expect(within(tools).getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('navigation', { name: 'Kitchen navigation' })).queryByRole('button', {
        name: 'Sign out',
      }),
    ).not.toBeInTheDocument();
  });
});
