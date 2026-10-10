import { render, screen } from '@testing-library/react';

import Home from './page';

describe('Home', () => {
  it('TC-KMS-FE-001: Given the KMS frontend loads, when the foundation page renders, then the foundation heading is visible', () => {
    // Arrange / Act
    render(<Home />);

    // Assert
    expect(
      screen.getByRole('heading', {
        name: 'KMS frontend foundation',
      }),
    ).toBeInTheDocument();
  });
});
