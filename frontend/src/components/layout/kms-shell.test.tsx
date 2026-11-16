const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/order-queue',
  useRouter: () => ({ replace: mockReplace }),
}));

import { render, screen } from '@testing-library/react';
import { AppProviders } from '@/providers/app-providers';
import { KmsShell } from './kms-shell';

function renderShell(role?: 'KITCHEN_MANAGER' | 'KITCHEN_STAFF') {
  return render(
    <AppProviders>
      <KmsShell role={role}>
        <p>Kitchen content</p>
      </KmsShell>
    </AppProviders>,
  );
}

describe('KMS authenticated and responsive shell', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the application heading, skip link and main landmark', () => {
    renderShell();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Kitchen Management System' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    skipLink.focus();
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(skipLink).toHaveFocus();
  });

  it('retains kitchen operations footer and hotel time', () => {
    renderShell();
    expect(screen.getByText('Forever Hotel Kitchen Operations')).toBeInTheDocument();
    expect(screen.getByLabelText('Current hotel time (Sri Lanka)')).toBeInTheDocument();
  });

  it('shows all three pages and logout for a kitchen manager', () => {
    renderShell('KITCHEN_MANAGER');
    expect(screen.getByRole('navigation', { name: 'Kitchen navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Order Queue' })).toHaveAttribute(
      'href',
      '/order-queue',
    );
    expect(screen.getByRole('link', { name: 'Menu Management' })).toHaveAttribute(
      'href',
      '/menu-management',
    );
    expect(screen.getByRole('link', { name: 'Time Windows' })).toHaveAttribute(
      'href',
      '/time-windows',
    );
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('shows only Order Queue and logout for kitchen staff', () => {
    renderShell('KITCHEN_STAFF');
    expect(screen.getByRole('link', { name: 'Order Queue' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Menu Management' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Time Windows' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('shows no operational navigation or logout for unauthenticated users', () => {
    renderShell();
    expect(
      screen.queryByRole('navigation', { name: 'Kitchen navigation' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('marks the current page in navigation', () => {
    renderShell('KITCHEN_MANAGER');
    expect(screen.getByRole('link', { name: 'Order Queue' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Menu Management' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
