/**
 * PostgreSQL TIME columns represent hotel wall-clock times, not UTC instants.
 * Evaluate at the server's request time explicitly in Asia/Colombo. The start
 * is inclusive; cutoff is exclusive. R-05 rejects overnight/ALL_DAY windows.
 */
export const HOTEL_TIME_ZONE = 'Asia/Colombo' as const;

const hotelClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: HOTEL_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export interface OrderingWindowTimes {
  orderStartTime: string;
  orderCutoffTime: string;
}

export function hotelLocalClock(at: Date): string {
  if (!Number.isFinite(at.getTime())) {
    throw new TypeError('A valid request timestamp is required');
  }
  const parts = hotelClock.formatToParts(at);
  const pick = (type: 'hour' | 'minute' | 'second'): string => {
    const part = parts.find((value) => value.type === type);
    if (!part) throw new Error(`Hotel clock is missing ${type}`);
    return part.value;
  };
  return `${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

/** For server-side order placement: re-check on EVERY request, not from UI state. */
export function isWithinOrderingWindow(
  window: OrderingWindowTimes,
  at: Date,
): boolean {
  const local = hotelLocalClock(at);
  return local >= window.orderStartTime && local < window.orderCutoffTime;
}
