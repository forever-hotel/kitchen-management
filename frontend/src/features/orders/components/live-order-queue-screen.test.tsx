import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { LiveOrderQueueScreen } from './live-order-queue-screen';

const order = {
  orderId: '11111111-1111-4111-8111-111111111111',
  bookingId: '22222222-2222-4222-8222-222222222222',
  roomNumber: '204',
  mealPeriod: 'LUNCH',
  status: 'PLACED',
  placedAt: '2026-11-08T04:00:00.000Z',
  estimatedDeliveryTime: null,
  allergyNote: 'No peanuts',
  totalAmount: 3000,
  items: [
    {
      orderItemId: '33333333-3333-4333-8333-333333333333',
      menuItemId: '44444444-4444-4444-8444-444444444444',
      name: 'Fried rice',
      quantity: 2,
      unitPrice: 1500,
      specialNote: 'Mild spice',
    },
  ],
};

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

const originalFetch = globalThis.fetch;

describe('DDP-262 Live Order Queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('shows persisted food orders instead of demonstration fixtures', async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse({ items: [order], total: 1 }));
    render(<LiveOrderQueueScreen />);
    expect(await screen.findByText('Fried rice')).toBeInTheDocument();
    expect(screen.getByText('Room 204')).toBeInTheDocument();
    expect(screen.getByText('Live orders')).toBeInTheDocument();
    expect(screen.queryByText('Demonstration data — not live')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      `/order-queue/${order.orderId}`,
    );
  });

  it('uses a compact summary toolbar without a duplicated visible page heading', async () => {
    const fetchCalls = jest.fn(async () => jsonResponse({ items: [order], total: 1 }));
    globalThis.fetch = fetchCalls as typeof fetch;
    render(<LiveOrderQueueScreen />);
    expect(await screen.findByText('Live orders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh queue' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Order Queue' })).toBeInTheDocument();
    expect(
      screen.queryByText('Live kitchen orders • Select an order to begin preparation'),
    ).not.toBeInTheDocument();
  });

  it('loads allergy warnings and requires explicit confirmation before acknowledgement and preparation', async () => {
    const calls: string[] = [];
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/kms/orders') return jsonResponse({ items: [order], total: 1 });
      if (init?.method === 'GET') {
        return jsonResponse({
          orderId: order.orderId,
          acknowledgementRequired: true,
          acknowledged: false,
          warnings: { allergyNote: 'No peanuts', itemAllergens: ['Peanuts'], dietaryLabels: [] },
        });
      }
      const payload = JSON.parse(String(init?.body)) as { action: string };
      calls.push(payload.action);
      return jsonResponse({ status: 'IN_PREPARATION', changed: true });
    }) as typeof fetch;

    render(<LiveOrderQueueScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start preparation' }));
    expect(
      await screen.findByText(/Allergy & Dietary Acknowledgement Required/i),
    ).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: /Confirm & start preparation/i });
    expect(submit).toBeDisabled();
    expect(calls).toEqual([]);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    await waitFor(() => {
      expect(calls).toEqual(['acknowledge', 'start']);
    });
  });

  it('marks an in-preparation order ready only after a confirmed response', async () => {
    const preparing = { ...order, status: 'IN_PREPARATION', allergyNote: null };
    let ready = false;
    const actions: string[] = [];
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/kms/orders') {
        return jsonResponse({
          items: [{ ...preparing, status: ready ? 'READY' : 'IN_PREPARATION' }],
          total: 1,
        });
      }
      const payload = JSON.parse(String(init?.body)) as { action: string };
      actions.push(payload.action);
      ready = true;
      return jsonResponse({ status: 'READY', changed: true });
    }) as typeof fetch;
    render(<LiveOrderQueueScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark ready' }));
    await waitFor(() => {
      expect(actions).toEqual(['ready']);
    });
    expect(await screen.findByText('Order marked ready.')).toBeInTheDocument();
  });

  it('renders a centered, high-contrast allergy modal header using Ant Design v6 semantic styles', async () => {
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/kms/orders') return jsonResponse({ items: [order], total: 1 });
      if (init?.method === 'GET') {
        return jsonResponse({
          orderId: order.orderId,
          acknowledgementRequired: true,
          acknowledged: false,
          warnings: { allergyNote: 'No peanuts', itemAllergens: ['Peanuts'], dietaryLabels: [] },
        });
      }
      throw new Error('Unexpected write during modal rendering');
    }) as typeof fetch;

    render(<LiveOrderQueueScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start preparation' }));
    // jsdom does not reliably report visibility while Ant Design's portal animation mounts.
    // Assert the dialog heading and the semantic header/title colors instead.
    expect(
      await screen.findByText('Allergy & Dietary Acknowledgement Required'),
    ).toBeInTheDocument();
    const header = document.querySelector('.ant-modal-header');
    expect(header).not.toBeNull();
    expect(header).toHaveStyle({ background: '#8d191b' });
    const title = document.querySelector('.ant-modal-title');
    expect(title).toHaveStyle({ color: '#ffffff' });
    const container = document.querySelector('.ant-modal-container');
    expect(container).toHaveStyle({ padding: '0' });
    const wrapper = document.querySelector('.ant-modal-wrap');
    expect(wrapper).toHaveClass('ant-modal-centered');
  });

  it('closes the allergy review when the backdrop is clicked without acknowledging', async () => {
    const calls: string[] = [];
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/kms/orders') return jsonResponse({ items: [order], total: 1 });
      if (init?.method === 'GET') {
        return jsonResponse({
          orderId: order.orderId,
          acknowledgementRequired: true,
          acknowledged: false,
          warnings: { allergyNote: 'No peanuts', itemAllergens: ['Peanuts'], dietaryLabels: [] },
        });
      }
      calls.push('mutation');
      return jsonResponse({});
    }) as typeof fetch;
    render(<LiveOrderQueueScreen />);
    fireEvent.click(await screen.findByRole('button', { name: 'Start preparation' }));
    expect(
      await screen.findByText('Allergy & Dietary Acknowledgement Required'),
    ).toBeInTheDocument();
    // Ant Design's dialog intentionally requires a pointer-down on the backdrop
    // before click, preventing a drag that starts inside the dialog from closing it.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled());
    const backdrop = document.querySelector('.ant-modal-wrap');
    expect(backdrop).not.toBeNull();
    fireEvent.mouseDown(backdrop as Element);
    fireEvent.click(backdrop as Element);
    // The hidden dialog content can linger during its exit animation in jsdom.
    // Test the user-visible dialog rather than querying all hidden DOM nodes.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls).toEqual([]);
  });

  it('dismisses a success notice automatically after 5 seconds', async () => {
    const preparing = { ...order, status: 'IN_PREPARATION', allergyNote: null };
    let ready = false;
    globalThis.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === '/api/kms/orders') {
        return jsonResponse({
          items: [{ ...preparing, status: ready ? 'READY' : 'IN_PREPARATION' }],
          total: 1,
        });
      }
      if (init?.method === 'POST') {
        ready = true;
        return jsonResponse({ status: 'READY', changed: true });
      }
      return jsonResponse({});
    }) as typeof fetch;
    // Capture only the notice's callback without replacing Jest's timer APIs
    // with mocks: Testing Library's async waitFor detects mocked timers as fake timers.
    const originalSetTimeout = window.setTimeout;
    const dismissCallbacks: Array<() => void> = [];
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      if (timeout === 5_000 && typeof handler === 'function') {
        dismissCallbacks.push(() => handler(...args));
      }
      return originalSetTimeout(handler, timeout, ...args);
    }) as typeof window.setTimeout;
    try {
      render(<LiveOrderQueueScreen />);
      fireEvent.click(await screen.findByRole('button', { name: 'Mark ready' }));
      expect(await screen.findByText('Order marked ready.')).toBeInTheDocument();
      await waitFor(() => expect(dismissCallbacks).toHaveLength(1));
      act(() => dismissCallbacks[0]());
      expect(screen.queryByText('Order marked ready.')).not.toBeInTheDocument();
    } finally {
      window.setTimeout = originalSetTimeout;
    }
  });

  it('does not submit an action when the live queue is empty', async () => {
    const calls = jest.fn(async () => jsonResponse({ items: [], total: 0 }));
    globalThis.fetch = calls as typeof fetch;
    render(<LiveOrderQueueScreen />);
    expect(await screen.findAllByText('No orders in this stage.')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Start preparation' })).not.toBeInTheDocument();
  });

  it('navigates to login when the staff session is expired', async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse({ error: 'Session expired' }, 401));
    render(<LiveOrderQueueScreen />);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
  });

  it('offers retry when the live backend is unavailable', async () => {
    globalThis.fetch = jest.fn(async () =>
      jsonResponse({ error: 'Kitchen backend unavailable' }, 503),
    );
    render(<LiveOrderQueueScreen />);
    expect(await screen.findByText('Kitchen backend unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
