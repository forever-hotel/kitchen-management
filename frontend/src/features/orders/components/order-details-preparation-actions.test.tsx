import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

import { OrderDetailsPreparationActions } from './order-details-preparation-actions';

const orderId = '11111111-1111-4111-8111-111111111111';
const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const safety = {
  orderId,
  acknowledgementRequired: true,
  acknowledged: false,
  warnings: {
    allergyNote: 'No peanuts',
    itemAllergens: ['Peanuts'],
    dietaryLabels: ['Vegetarian'],
  },
};

describe('DDP-265 Order Details preparation actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('checks safety, asks for confirmation, then acknowledges and starts', async () => {
    const actions: string[] = [];
    globalThis.fetch = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') return jsonResponse(safety);
      const body = JSON.parse(String(init?.body)) as { action: string };
      actions.push(body.action);
      return jsonResponse({ changed: true });
    }) as typeof fetch;

    render(<OrderDetailsPreparationActions orderId={orderId} status="PLACED" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start preparation' }));

    expect(await screen.findByText(/No peanuts/)).toBeInTheDocument();
    expect(screen.getByText('Peanuts')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(actions).toEqual([]);

    const submit = screen.getByRole('button', { name: 'Acknowledge and start' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(submit);

    await waitFor(() => expect(actions).toEqual(['acknowledge', 'start']));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  it('starts preparation directly when warnings have already been acknowledged', async () => {
    const actions: string[] = [];
    globalThis.fetch = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') {
        return jsonResponse({ ...safety, acknowledged: true });
      }
      actions.push((JSON.parse(String(init?.body)) as { action: string }).action);
      return jsonResponse({ changed: true });
    }) as typeof fetch;
    render(<OrderDetailsPreparationActions orderId={orderId} status="PLACED" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start preparation' }));
    await waitFor(() => expect(actions).toEqual(['start']));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  it('marks in-progress preparation ready via the protected BFF', async () => {
    const actions: string[] = [];
    globalThis.fetch = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      actions.push((JSON.parse(String(init?.body)) as { action: string }).action);
      return jsonResponse({ status: 'READY', changed: true });
    }) as typeof fetch;
    render(<OrderDetailsPreparationActions orderId={orderId} status="IN_PREPARATION" />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready' }));
    await waitFor(() => expect(actions).toEqual(['ready']));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  it('does not offer preparation actions for delivered, ready, or cancelled orders', () => {
    const { rerender } = render(
      <OrderDetailsPreparationActions orderId={orderId} status="CANCELLED" />,
    );
    expect(screen.queryByRole('button', { name: 'Mark ready' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start preparation' })).not.toBeInTheDocument();
    rerender(<OrderDetailsPreparationActions orderId={orderId} status="READY" />);
    expect(screen.getByText(/Ready for delivery/i)).toBeInTheDocument();
    rerender(<OrderDetailsPreparationActions orderId={orderId} status="DELIVERED" />);
    expect(screen.getByText(/has been delivered/i)).toBeInTheDocument();
  });

  it('does not modify the order when warning acknowledgement is cancelled', async () => {
    const actions: string[] = [];
    globalThis.fetch = jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'GET') return jsonResponse(safety);
      actions.push((JSON.parse(String(init?.body)) as { action: string }).action);
      return jsonResponse({ changed: true });
    }) as typeof fetch;
    render(<OrderDetailsPreparationActions orderId={orderId} status="PLACED" />);
    fireEvent.click(screen.getByRole('button', { name: 'Start preparation' }));
    expect(await screen.findByText(/No peanuts/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(actions).toHaveLength(0);
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('reports status conflicts and never claims success', async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse({ error: 'Order state changed' }, 409));
    render(<OrderDetailsPreparationActions orderId={orderId} status="IN_PREPARATION" />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready' }));
    expect(await screen.findByText('Order state changed')).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('redirects to login when the verified staff session expires', async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse({ error: 'Unauthorized' }, 401));
    render(<OrderDetailsPreparationActions orderId={orderId} status="IN_PREPARATION" />);
    fireEvent.click(screen.getByRole('button', { name: 'Mark ready' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
