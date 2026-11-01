import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import PasswordChangeForm from './password-change-form';

const mockFetch = jest.fn();
const originalFetch = globalThis.fetch;

function fillPasswords(current = 'OldPassword123!', next = 'NewPassword123!', confirm = next) {
  fireEvent.change(screen.getByLabelText('Current Password'), {
    target: { value: current },
  });

  fireEvent.change(screen.getByLabelText('New Password'), {
    target: { value: next },
  });

  fireEvent.change(screen.getByLabelText('Confirm New Password'), {
    target: { value: confirm },
  });
}

function submitForm() {
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Update Password',
    }),
  );
}

describe('KMS mandatory password change screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = mockFetch as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders the required password change form', () => {
    render(<PasswordChangeForm username="chef.manager" />);

    expect(
      screen.getByRole('heading', {
        name: 'Change Temporary Password',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/Welcome, chef.manager/)).toBeInTheDocument();

    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();

    expect(screen.getByLabelText('New Password')).toBeInTheDocument();

    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('requires the current password', async () => {
    render(<PasswordChangeForm username="chef.manager" />);

    submitForm();

    expect(await screen.findByText('Enter your current password')).toBeInTheDocument();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects passwords shorter than 12 characters', async () => {
    render(<PasswordChangeForm username="chef.manager" />);

    fillPasswords('OldPassword123!', 'short', 'short');

    submitForm();

    expect(await screen.findByText('Use at least 12 characters')).toBeInTheDocument();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects mismatching confirmation passwords', async () => {
    render(<PasswordChangeForm username="chef.manager" />);

    fillPasswords('OldPassword123!', 'NewPassword123!', 'DifferentPassword123!');

    submitForm();

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('submits valid passwords and displays a Gateway rejection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'Authentication failed',
      }),
    });

    render(<PasswordChangeForm username="chef.manager" />);

    fillPasswords();
    submitForm();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
        }),
      );
    });

    const options = mockFetch.mock.calls[0][1];

    expect(JSON.parse(options.body)).toEqual({
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    });

    expect(options.body).not.toContain('confirmPassword');

    expect(await screen.findByText('Authentication failed')).toBeInTheDocument();
  });

  it('displays authentication connectivity failures', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

    render(<PasswordChangeForm username="chef.manager" />);

    fillPasswords();
    submitForm();

    expect(
      await screen.findByText('Unable to connect to the authentication service.'),
    ).toBeInTheDocument();
  });
});
