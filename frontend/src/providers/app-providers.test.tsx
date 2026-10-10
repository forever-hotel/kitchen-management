import { render, screen } from '@testing-library/react';
import { Button } from 'antd';

import { kmsTheme } from '@/config/theme';

import { AppProviders } from './app-providers';

describe('AppProviders', () => {
  it('TC-KMS-FE-002: Given the application provider, when an Ant Design component renders, then it is available to application content', () => {
    // Arrange / Act
    render(
      <AppProviders>
        <Button type="primary">Foundation action</Button>
      </AppProviders>,
    );

    // Assert
    expect(
      screen.getByRole('button', {
        name: 'Foundation action',
      }),
    ).toBeInTheDocument();
  });

  it('TC-KMS-FE-003: Given the shared KMS theme, when theme tokens are inspected, then the approved primary colour and accessible base control height are configured', () => {
    // Arrange / Act / Assert
    expect(kmsTheme.token?.colorPrimary).toBe('#1A3C5E');
    expect(kmsTheme.token?.controlHeight).toBe(44);
  });
});
