import type { KmsOrderingWindowData } from '@/types/kms-menu';

/** PostgreSQL TIME is a hotel-local wall clock, never a UTC timestamp. */
export const HOTEL_TIME_ZONE = 'Asia/Colombo' as const;

export type OrderingWindowPatch = Partial<
  Pick<KmsOrderingWindowData, 'orderStartTime' | 'orderCutoffTime'>
>;

export type WindowState = 'OPEN' | 'UPCOMING' | 'CLOSED';

const clockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: HOTEL_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export function normalizeTime(time: string): string | null {
  const result = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(time);
  return result ? `${result[1]}:${result[2]}:${result[3] ?? '00'}` : null;
}

export function hotelTime(at: Date): string {
  if (!Number.isFinite(at.getTime())) throw new TypeError('Invalid clock date');
  const parts = clockFormatter.formatToParts(at);
  const field = (type: 'hour' | 'minute' | 'second') => {
    const part = parts.find((part) => part.type === type);
    if (!part) throw new Error(`Missing ${type} in hotel clock`);
    return part.value;
  };
  return `${field('hour')}:${field('minute')}:${field('second')}`;
}

export function displayTime(value: string): string {
  const canonical = normalizeTime(value);
  if (!canonical) return value;
  const [hours, minutes] = canonical.split(':');
  const hour = Number(hours);
  return `${String(hour % 12 || 12).padStart(2, '0')}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function windowState(window: KmsOrderingWindowData, now: Date): WindowState {
  const start = normalizeTime(window.orderStartTime);
  const cutoff = normalizeTime(window.orderCutoffTime);
  if (!start || !cutoff || start >= cutoff) return 'CLOSED';
  const local = hotelTime(now);
  if (local < start) return 'UPCOMING';
  return local < cutoff ? 'OPEN' : 'CLOSED';
}

export function buildWindowPatch(
  saved: KmsOrderingWindowData,
  draftStart: string,
  draftCutoff: string,
): { patch: OrderingWindowPatch; error: string | null } {
  const start = normalizeTime(draftStart);
  const cutoff = normalizeTime(draftCutoff);
  if (!start || !cutoff) {
    return { patch: {}, error: 'Enter valid times using HH:mm in 24-hour format.' };
  }
  const savedStart = normalizeTime(saved.orderStartTime);
  const savedCutoff = normalizeTime(saved.orderCutoffTime);
  if (!savedStart || !savedCutoff) {
    return { patch: {}, error: 'Saved ordering times are invalid. Refresh before editing.' };
  }
  // Native minute-precision inputs must never silently overwrite saved seconds.
  const startChanged = draftStart !== saved.orderStartTime.slice(0, 5);
  const cutoffChanged = draftCutoff !== saved.orderCutoffTime.slice(0, 5);
  const effectiveStart = startChanged ? start : savedStart;
  const effectiveCutoff = cutoffChanged ? cutoff : savedCutoff;
  if (effectiveStart >= effectiveCutoff) {
    return { patch: {}, error: 'Order cutoff must be later than start on the same day.' };
  }
  const patch: OrderingWindowPatch = {};
  if (startChanged) patch.orderStartTime = start;
  if (cutoffChanged) patch.orderCutoffTime = cutoff;
  return { patch, error: null };
}

/** Do not show raw server exceptions or security details in a manager-facing form. */
export function windowUpdateError(error: unknown): string {
  const response = error as { status?: unknown; response?: { status?: unknown } } | null;
  const status = response?.status ?? response?.response?.status;
  switch (status) {
    case 400:
      return 'The ordering times were rejected. Check the start and cutoff.';
    case 401:
      return 'Your staff session has expired. Sign in again.';
    case 403:
      return 'Only Kitchen Managers can change ordering windows.';
    case 404:
      return 'This meal category no longer exists. Refresh the page.';
    case 409:
      return 'The ordering window conflicts with another change. Refresh and retry.';
    default:
      return 'Could not save the ordering window. Check your connection and retry.';
  }
}
