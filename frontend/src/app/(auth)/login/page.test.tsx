import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import LoginPage from './page';

const mockFetch = jest.fn();
const originalFetch = globalThis.fetch;

function fillCredentials() {
  fireEvent.change(screen.getByLabelText('Username'), {
    target: { value: 'chef.manager' },
  });

  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'TestPassword123!' },
  });
}

describe('KMS staff login screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = mockFetch as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders the staff login form', () => {
    render(<LoginPage />);

    expect(
      screen.getByRole('heading', {
        name: 'Kitchen Management Login',
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Username')).toBeInTheDocument();

    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('requires credentials before submitting', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls the KMS login endpoint and displays invalid credentials', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'Invalid username or password',
      }),
    });

    render(<LoginPage />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'same-origin',
        }),
      );
    });

    const requestOptions = mockFetch.mock.calls[0][1];

    expect(JSON.parse(requestOptions.body)).toEqual({
      username: 'chef.manager',
      password: 'TestPassword123!',
    });

    expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  });

  it('handles authentication service connection failures', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network unavailable'));

    render(<LoginPage />);
    fillCredentials();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Unable to connect to the authentication service.'),
    ).toBeInTheDocument();
  });
});
