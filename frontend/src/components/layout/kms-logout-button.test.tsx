import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

import { KmsLogoutButton } from './kms-logout-button';

const mockFetch = jest.fn();
const originalFetch = globalThis.fetch;

describe('KMS logout button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = mockFetch as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders the Sign out button', () => {
    render(<KmsLogoutButton />);

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('calls the logout API and redirects after success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'signed_out',
      }),
    });

    render(<KmsLogoutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
        }),
      );
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('shows Gateway logout failures without redirecting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        error: 'Unable to complete logout. Please retry.',
      }),
    });

    render(<KmsLogoutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to complete logout. Please retry.',
    );

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('handles network failures safely', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

    render(<KmsLogoutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to contact the logout service',
    );

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('rejects unexpected logout responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'unexpected',
      }),
    });

    render(<KmsLogoutButton />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Logout could not be confirmed.');

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
