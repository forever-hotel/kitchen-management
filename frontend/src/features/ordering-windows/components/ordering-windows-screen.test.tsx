import { render, screen } from '@testing-library/react';

import { AppProviders } from '@/providers/app-providers';

import { ORDERING_WINDOWS_FIXTURE } from '../../../../tests/fixtures/kms-ordering-windows.fixture';
import { OrderingWindowsScreen } from '..';

describe('R-01 ordering-windows feature entry point', () => {
  it('TC-KMS-R01-07: Given typed sample windows, when rendered, then time-window screen displays their count', () => {
    render(
      <AppProviders>
        <OrderingWindowsScreen windows={ORDERING_WINDOWS_FIXTURE} />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: 'Ordering Time Windows' })).toBeInTheDocument();
    expect(screen.getByText('Feature scaffold')).toBeInTheDocument();
    expect(screen.getByText('Ordering windows: 4.')).toBeInTheDocument();
  });
});
