import '@testing-library/jest-dom';

/**
 * Browser API mocks required by Ant Design components
 * when tests run in Jest's jsdom environment.
 */

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

/**
 * @rc-component/form uses MessageChannel to schedule
 * asynchronous form notifications.
 *
 * jsdom does not provide this API in our test setup.
 * Use a lightweight test-only implementation.
 */
if (typeof globalThis.MessageChannel === 'undefined') {
  class TestMessageChannel {
    port1 = {
      onmessage: null as ((event: MessageEvent) => void) | null,
    };

    port2 = {
      postMessage: (data: unknown): void => {
        setTimeout(() => {
          this.port1.onmessage?.({
            data,
          } as MessageEvent);
        }, 0);
      },
    };
  }

  Object.defineProperty(globalThis, 'MessageChannel', {
    configurable: true,
    writable: true,
    value: TestMessageChannel,
  });
}
