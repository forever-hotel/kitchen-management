import { render, screen } from '@testing-library/react';

import Home from './page';

describe('Home', () => {
  it('TC-KMS-FE-001: Given the KMS frontend loads, when the home page renders, then the application heading is visible', () => {
    // Arrange / Act
    render(<Home />);

    // Assert
    expect(
      screen.getByRole('heading', {
        name: 'Forever Hotel Kitchen Management System',
      }),
    ).toBeInTheDocument();
  });
});
