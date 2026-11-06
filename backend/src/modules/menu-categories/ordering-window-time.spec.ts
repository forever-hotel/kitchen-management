import {
  HOTEL_TIME_ZONE,
  hotelLocalClock,
  isWithinOrderingWindow,
} from './ordering-window-time.js';

const lunch = { orderStartTime: '11:30:00', orderCutoffTime: '14:30:00' };

describe('R-11 Asia/Colombo server-side ordering-window evaluation', () => {
  it('TC-KMS-R11-005: uses Asia/Colombo rather than the host OS timezone', () => {
    expect(HOTEL_TIME_ZONE).toBe('Asia/Colombo');
    expect(hotelLocalClock(new Date('2026-11-06T06:00:00.000Z'))).toBe(
      '11:30:00',
    );
    expect(hotelLocalClock(new Date('2026-11-06T18:40:01.000Z'))).toBe(
      '00:10:01',
    );
  });

  it('TC-KMS-R11-006: includes exact opening instant and rejects one second earlier', () => {
    expect(
      isWithinOrderingWindow(lunch, new Date('2026-11-06T05:59:59Z')),
    ).toBe(false);
    expect(
      isWithinOrderingWindow(lunch, new Date('2026-11-06T06:00:00Z')),
    ).toBe(true);
  });

  it('TC-KMS-R11-007: includes last second before cutoff and excludes cutoff itself', () => {
    expect(
      isWithinOrderingWindow(lunch, new Date('2026-11-06T08:59:59Z')),
    ).toBe(true);
    expect(
      isWithinOrderingWindow(lunch, new Date('2026-11-06T09:00:00Z')),
    ).toBe(false);
  });

  it('TC-KMS-R11-008: invalid request instants are rejected rather than assumed open', () => {
    expect(() => isWithinOrderingWindow(lunch, new Date('invalid'))).toThrow(
      TypeError,
    );
  });
});
