import { render, screen } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';

import { KmsShell } from './kms-shell';

jest.mock('next/navigation', () => ({
  usePathname: () => '/order-queue',
}));

describe('KmsShell', () => {
  it('TC-KMS-FE-004: renders the app heading and main landmark', () => {
    render(
      <AppProviders>
        <KmsShell>
          <p>Foundation content</p>
        </KmsShell>
      </AppProviders>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: 'Kitchen Management System' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Foundation content')).toBeInTheDocument();
  });

  it('TC-KMS-FE-005: skip link targets the main content', () => {
    render(
      <AppProviders>
        <KmsShell>
          <p>Foundation content</p>
        </KmsShell>
      </AppProviders>,
    );
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    skipLink.focus();
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(skipLink).toHaveFocus();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('TC-KMS-FE-006: retains the kitchen operations footer', () => {
    render(
      <AppProviders>
        <KmsShell>
          <p>Foundation content</p>
        </KmsShell>
      </AppProviders>,
    );
    expect(screen.getByText('Forever Hotel Kitchen Operations')).toBeInTheDocument();
  });

  it('TC-KMS-SF-002: kitchen manager sees all three navigation links', () => {
    render(
      <AppProviders>
        <KmsShell role="KITCHEN_MANAGER">
          <p>Manager dashboard</p>
        </KmsShell>
      </AppProviders>,
    );

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
  });

  it('TC-KMS-SF-003: kitchen staff sees Order Queue only', () => {
    render(
      <AppProviders>
        <KmsShell role="KITCHEN_STAFF">
          <p>Kitchen staff workspace</p>
        </KmsShell>
      </AppProviders>,
    );

    expect(screen.getByRole('link', { name: 'Order Queue' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Menu Management' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Time Windows' })).not.toBeInTheDocument();
  });

  it('unauthenticated users have no operational navigation by default', () => {
    render(
      <AppProviders>
        <KmsShell>
          <p>Public content</p>
        </KmsShell>
      </AppProviders>,
    );
    expect(
      screen.queryByRole('navigation', { name: 'Kitchen navigation' }),
    ).not.toBeInTheDocument();
  });

  it('marks the current page without changing available routes', () => {
    render(
      <AppProviders>
        <KmsShell role="KITCHEN_MANAGER">
          <p>Kitchen content</p>
        </KmsShell>
      </AppProviders>,
    );
    expect(screen.getByRole('link', { name: 'Order Queue' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Menu Management' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('local preview displays all three links but no visible preview badge', () => {
    render(
      <AppProviders>
        <KmsShell previewNavigation>
          <p>Fixture demonstration</p>
        </KmsShell>
      </AppProviders>,
    );
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
    expect(screen.queryByText('UI Preview')).not.toBeInTheDocument();
  });

  it('renders the hydration-safe hotel clock container', () => {
    render(
      <AppProviders>
        <KmsShell role="KITCHEN_MANAGER">
          <p>Kitchen content</p>
        </KmsShell>
      </AppProviders>,
    );
    expect(screen.getByLabelText('Current hotel time (Sri Lanka)')).toBeInTheDocument();
  });
});
