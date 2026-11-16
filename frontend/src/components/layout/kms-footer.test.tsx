import { fireEvent, render, screen, within } from '@testing-library/react';

import { KmsFooter } from './kms-footer';

describe('DDP-274 simple shared KMS footer', () => {
  it('shows branding, copyright and back-to-top without duplicate navigation links', () => {
    render(<KmsFooter />);

    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText('FOREVER · KMS')).toBeInTheDocument();
    expect(within(footer).getByText('Forever Hotel Kitchen Operations')).toBeInTheDocument();
    expect(within(footer).getByText(/Forever Hotel\. All rights reserved\./)).toBeInTheDocument();
    expect(within(footer).getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
    expect(within(footer).queryByRole('navigation')).not.toBeInTheDocument();
    expect(within(footer).queryByRole('link')).not.toBeInTheDocument();
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
