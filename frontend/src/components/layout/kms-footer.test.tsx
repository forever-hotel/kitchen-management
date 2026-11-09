import { fireEvent, render, screen, within } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  usePathname: () => '/menu-management',
}));

import { KmsFooter, KmsFooterRoleProvider } from './kms-footer';

describe('DDP-274 shared and interactive KMS footer', () => {
  it('shows branding, current-page shortcuts and a back-to-top action for managers', () => {
    render(
      <KmsFooterRoleProvider role="KITCHEN_MANAGER">
        <KmsFooter />
      </KmsFooterRoleProvider>,
    );

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('Forever Hotel Kitchen Operations')).toBeInTheDocument();
    const nav = within(footer).getByRole('navigation', { name: 'Kitchen footer shortcuts' });
    expect(within(nav).getByRole('link', { name: 'Menu Management' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Time Windows' })).toHaveAttribute(
      'href',
      '/time-windows',
    );
    expect(within(footer).getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
  });

  it('does not expose manager-only shortcuts to kitchen staff', () => {
    render(
      <KmsFooterRoleProvider role="KITCHEN_STAFF">
        <KmsFooter />
      </KmsFooterRoleProvider>,
    );

    expect(screen.getByRole('link', { name: 'Order Queue' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Menu Management' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Time Windows' })).not.toBeInTheDocument();
  });

  it('does not expose shortcuts without a role', () => {
    render(<KmsFooter />);
    expect(
      screen.queryByRole('navigation', { name: 'Kitchen footer shortcuts' }),
    ).not.toBeInTheDocument();
  });

  it('scrolls to the top when clicked, respecting reduced-motion preferences', () => {
    const scrollTo = jest.fn();
    const originalScroll = window.scrollTo;
    const originalMatchMedia = window.matchMedia;
    window.scrollTo = scrollTo;
    window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;

    try {
      render(<KmsFooter />);
      fireEvent.click(screen.getByRole('button', { name: 'Back to top' }));
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    } finally {
      window.scrollTo = originalScroll;
      window.matchMedia = originalMatchMedia;
    }
  });
});
