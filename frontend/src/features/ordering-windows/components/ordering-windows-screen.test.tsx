import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';

import { AppProviders } from '@/providers/app-providers';
import type { KmsOrderingWindowData } from '@/types/kms-menu';

import { MENU_PREVIEW_CATEGORIES } from '@/features/menu/data/menu-preview.data';

import type { OrderingWindowPatch } from '../utils/ordering-window.util';
import { OrderingWindowsScreen } from './ordering-windows-screen';

const windows = MENU_PREVIEW_CATEGORIES;
const atLunch = new Date('2026-11-06T07:04:00Z'); // 12:34 in Sri Lanka
const lunchId = '22222222-2222-4222-8222-222222222222';

function renderScreen(overrides: Partial<ComponentProps<typeof OrderingWindowsScreen>> = {}) {
  return render(
    <AppProviders>
      <OrderingWindowsScreen
        windows={windows}
        categories={MENU_PREVIEW_CATEGORIES}
        now={atLunch}
        {...overrides}
      />
    </AppProviders>,
  );
}

const lunchCard = () => screen.getByRole('article', { name: 'Lunch ordering window' });

describe('R-12 Time Windows Figma screen', () => {
  it('TC-KMS-R01-07: legacy fixture preview still labels itself and shows four windows', () => {
    render(
      <AppProviders>
        <OrderingWindowsScreen windows={windows} />
      </AppProviders>,
    );
    expect(screen.getByRole('heading', { name: 'Ordering Time Windows' })).toBeInTheDocument();
    expect(screen.getByText('Feature scaffold')).toBeInTheDocument();
    expect(screen.getByText('Ordering windows: 4.')).toBeInTheDocument();
  });

  it('TC-KMS-R12-008: renders four named Figma cards and a daily timeline', () => {
    renderScreen();
    ['Breakfast', 'Lunch', 'Tea-Time', 'Dinner'].forEach((name) => {
      expect(screen.getByRole('article', { name: `${name} ordering window` })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /today.s timeline/i })).toBeInTheDocument();
    expect(screen.getByText(/Current hotel time:/)).toHaveTextContent('12:34 PM');
    expect(within(lunchCard()).getByText(/Live now/)).toBeInTheDocument();
    expect(screen.getAllByText(/Asia\/Colombo/).length).toBeGreaterThan(0);
  });

  it('TC-KMS-R12-009: preview does not claim API writes or enable saving', () => {
    renderScreen();
    fireEvent.change(within(lunchCard()).getByLabelText('Lunch cutoff time'), {
      target: { value: '15:00' },
    });
    expect(within(lunchCard()).getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    expect(within(lunchCard()).getByText(/Preview only/)).toBeInTheDocument();
  });

  it('TC-KMS-R12-010: changing then resetting restores the saved window without a write', () => {
    const onUpdateWindow = jest.fn<Promise<unknown>, [string, OrderingWindowPatch]>();
    const onReloadWindows = jest.fn<Promise<readonly KmsOrderingWindowData[]>, []>();
    renderScreen({ dataMode: 'api', onUpdateWindow, onReloadWindows });
    const cutoff = within(lunchCard()).getByLabelText('Lunch cutoff time');
    fireEvent.change(cutoff, { target: { value: '15:00' } });
    expect(cutoff).toHaveValue('15:00');
    fireEvent.click(within(lunchCard()).getByRole('button', { name: 'Reset to Saved' }));
    expect(cutoff).toHaveValue('14:30');
    expect(onUpdateWindow).not.toHaveBeenCalled();
  });

  it('TC-KMS-R12-011: invalid cutoff is blocked before PATCH', async () => {
    const onUpdateWindow = jest.fn<Promise<unknown>, [string, OrderingWindowPatch]>();
    const onReloadWindows = jest.fn<Promise<readonly KmsOrderingWindowData[]>, []>();
    renderScreen({ dataMode: 'api', onUpdateWindow, onReloadWindows });
    fireEvent.change(within(lunchCard()).getByLabelText('Lunch cutoff time'), {
      target: { value: '10:00' },
    });
    fireEvent.click(within(lunchCard()).getByRole('button', { name: 'Save Changes' }));
    expect(await within(lunchCard()).findByRole('alert')).toHaveTextContent(/later than start/i);
    expect(onUpdateWindow).not.toHaveBeenCalled();
  });

  it('TC-KMS-R12-012: saves only changed cutoff and refreshes server values', async () => {
    const onUpdateWindow = jest
      .fn<Promise<unknown>, [string, OrderingWindowPatch]>()
      .mockResolvedValue(undefined);
    const savedWindows = windows.map((window) =>
      window.categoryId === lunchId ? { ...window, orderCutoffTime: '15:00:00' } : window,
    );
    const onReloadWindows = jest
      .fn<Promise<readonly KmsOrderingWindowData[]>, []>()
      .mockResolvedValue(savedWindows);
    renderScreen({ dataMode: 'api', onUpdateWindow, onReloadWindows });
    fireEvent.change(within(lunchCard()).getByLabelText('Lunch cutoff time'), {
      target: { value: '15:00' },
    });
    fireEvent.click(within(lunchCard()).getByRole('button', { name: 'Save Changes' }));
    await waitFor(() =>
      expect(onUpdateWindow).toHaveBeenCalledWith(lunchId, { orderCutoffTime: '15:00:00' }),
    );
    await waitFor(() => expect(onReloadWindows).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(within(lunchCard()).getByLabelText('Lunch cutoff time')).toHaveValue('15:00'),
    );
    expect(
      screen.getByText('Ordering window saved and refreshed from the server.'),
    ).toBeInTheDocument();
  });

  it('TC-KMS-R12-013: a manager 403 keeps the draft without a fake success', async () => {
    const onUpdateWindow = jest
      .fn<Promise<unknown>, [string, OrderingWindowPatch]>()
      .mockRejectedValue({ status: 403 });
    const onReloadWindows = jest.fn<Promise<readonly KmsOrderingWindowData[]>, []>();
    renderScreen({ dataMode: 'api', onUpdateWindow, onReloadWindows });
    fireEvent.change(within(lunchCard()).getByLabelText('Lunch cutoff time'), {
      target: { value: '15:00' },
    });
    fireEvent.click(within(lunchCard()).getByRole('button', { name: 'Save Changes' }));
    expect(await within(lunchCard()).findByRole('alert')).toHaveTextContent(
      /Only Kitchen Managers/,
    );
    expect(within(lunchCard()).getByLabelText('Lunch cutoff time')).toHaveValue('15:00');
    expect(onReloadWindows).not.toHaveBeenCalled();
    expect(
      screen.queryByText('Ordering window saved and refreshed from the server.'),
    ).not.toBeInTheDocument();
  });

  it('TC-KMS-R12-014: reload failure can retry without duplicating saved PATCH', async () => {
    const onUpdateWindow = jest
      .fn<Promise<unknown>, [string, OrderingWindowPatch]>()
      .mockResolvedValue(undefined);
    const fresh = windows.map((window) =>
      window.categoryId === lunchId ? { ...window, orderCutoffTime: '15:00:00' } : window,
    );
    const onReloadWindows = jest
      .fn<Promise<readonly KmsOrderingWindowData[]>, []>()
      .mockRejectedValueOnce(new Error('temporary network outage'))
      .mockResolvedValueOnce(fresh);
    renderScreen({ dataMode: 'api', onUpdateWindow, onReloadWindows });
    fireEvent.change(within(lunchCard()).getByLabelText('Lunch cutoff time'), {
      target: { value: '15:00' },
    });
    fireEvent.click(within(lunchCard()).getByRole('button', { name: 'Save Changes' }));
    expect(await within(lunchCard()).findByRole('alert')).toHaveTextContent(/saved, but the list/i);
    expect(
      within(lunchCard()).queryByRole('button', { name: 'Save Changes' }),
    ).not.toBeInTheDocument();
    fireEvent.click(within(lunchCard()).getByRole('button', { name: 'Retry refresh' }));
    await waitFor(() => expect(onReloadWindows).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(within(lunchCard()).getByLabelText('Lunch cutoff time')).toHaveValue('15:00'),
    );
    expect(onUpdateWindow).toHaveBeenCalledTimes(1);
  });

  it('TC-KMS-R12-015: status labels change when the hotel clock crosses start and cutoff', () => {
    const { rerender } = renderScreen({ now: new Date('2026-11-06T05:59:59Z') });
    expect(within(lunchCard()).getByText(/Opens at/)).toBeInTheDocument();
    rerender(
      <AppProviders>
        <OrderingWindowsScreen
          windows={windows}
          categories={MENU_PREVIEW_CATEGORIES}
          now={new Date('2026-11-06T06:00:00Z')}
        />
      </AppProviders>,
    );
    expect(within(lunchCard()).getByText(/Live now/)).toBeInTheDocument();
    rerender(
      <AppProviders>
        <OrderingWindowsScreen
          windows={windows}
          categories={MENU_PREVIEW_CATEGORIES}
          now={new Date('2026-11-06T09:00:00Z')}
        />
      </AppProviders>,
    );
    expect(within(lunchCard()).getByText('Closed')).toBeInTheDocument();
  });
});
