import { render, screen } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';

import { KmsShell } from './kms-shell';

describe('KmsShell', () => {
  it('TC-KMS-FE-004: Given KMS application content, when the shared shell renders, then the application heading and main landmark are present', () => {
    // Arrange / Act
    render(
      <AppProviders>
        <KmsShell>
          <p>Foundation content</p>
        </KmsShell>
      </AppProviders>,
    );

    // Assert
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Kitchen Management System',
      }),
    ).toBeInTheDocument();

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Foundation content')).toBeInTheDocument();
  });

  it('TC-KMS-FE-005: Given keyboard navigation, when the shell renders, then a focusable skip link targets the main content', () => {
    // Arrange
    render(
      <AppProviders>
        <KmsShell>
          <p>Foundation content</p>
        </KmsShell>
      </AppProviders>,
    );

    const skipLink = screen.getByRole('link', {
      name: 'Skip to main content',
    });

    // Act
    skipLink.focus();

    // Assert
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(skipLink).toHaveFocus();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('TC-KMS-FE-006: Given the KMS shell, when it renders, then the shared kitchen operations footer is present', () => {
    // Arrange / Act
    render(
      <AppProviders>
        <KmsShell>
          <p>Foundation content</p>
        </KmsShell>
      </AppProviders>,
    );

    // Assert
    expect(screen.getByText('Forever Hotel Kitchen Operations')).toBeInTheDocument();
  });
});
