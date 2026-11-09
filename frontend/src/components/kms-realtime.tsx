'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';

/** One shared connection per protected workspace. Credentials remain server-side. */
export function KmsRealtime() {
  const router = useRouter();
  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    let socket: Socket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let refresh: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const changed = () => {
      clearTimeout(refresh);
      refresh = setTimeout(() => {
        window.dispatchEvent(new Event('kms:refresh'));
        router.refresh();
      }, 150);
    };
    const schedule = () => {
      if (stopped || retry || attempts >= 5) return;
      retry = setTimeout(
        () => {
          retry = undefined;
          void connect();
        },
        Math.min(1000 * 2 ** attempts, 15000),
      );
    };
    const connect = async () => {
      attempts += 1;
      try {
        const response = await fetch('/api/realtime/ticket', {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Ticket unavailable');
        const data = (await response.json()) as { ticket: string; socketUrl: string };
        if (stopped) return;
        socket?.disconnect();
        socket = io(data.socketUrl, {
          path: '/realtime/socket.io',
          transports: ['websocket'],
          auth: { ticket: data.ticket },
          reconnection: false,
        });
        socket.on('connect', () => {
          attempts = 0;
          changed();
        });
        socket.on('kitchen.order.changed', changed);
        socket.on('menu.changed', changed);
        socket.on('connect_error', schedule);
        socket.on('disconnect', schedule);
      } catch {
        schedule();
      }
    };
    void connect();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(retry);
      clearTimeout(refresh);
      socket?.disconnect();
    };
  }, [router]);
  return null;
}
