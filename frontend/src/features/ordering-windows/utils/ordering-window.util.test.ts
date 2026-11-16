import type { KmsOrderingWindowData } from '@/types/kms-menu';

import {
  buildWindowPatch,
  displayTime,
  hotelTime,
  normalizeTime,
  windowState,
  windowUpdateError,
} from './ordering-window.util';

const lunch: KmsOrderingWindowData = {
  categoryId: '22222222-2222-4222-8222-222222222222',
  orderStartTime: '11:30:00',
  orderCutoffTime: '14:30:00',
};

describe('R-12 ordering-window rules', () => {
  it('TC-KMS-R12-001: strict 24-hour formats and canonical wall-clock seconds', () => {
    expect(normalizeTime('11:30')).toBe('11:30:00');
    expect(normalizeTime('14:30:15')).toBe('14:30:15');
    ['24:00', '12:60', '12:30:60', '2:30 PM', '11:30Z', ''].forEach((time) => {
      expect(normalizeTime(time)).toBeNull();
    });
  });

  it('TC-KMS-R12-002: hotel clock ignores browser time zone and renders local time', () => {
    const at = new Date('2026-11-06T07:04:30.000Z');
    expect(hotelTime(at)).toBe('12:34:30');
    expect(displayTime('14:30:00')).toBe('02:30 PM');
    expect(() => hotelTime(new Date('bad'))).toThrow();
  });

  it('TC-KMS-R12-003: opening is inclusive and cutoff exclusive in Asia/Colombo', () => {
    expect(windowState(lunch, new Date('2026-11-06T05:59:59Z'))).toBe('UPCOMING');
    expect(windowState(lunch, new Date('2026-11-06T06:00:00Z'))).toBe('OPEN');
    expect(windowState(lunch, new Date('2026-11-06T09:00:00Z'))).toBe('CLOSED');
  });

  it('TC-KMS-R12-004: invalid, equal and reversed same-day windows are rejected', () => {
    expect(buildWindowPatch(lunch, '11:30', '11:30').error).toMatch(/later than start/i);
    expect(buildWindowPatch(lunch, '20:30', '14:30').error).toMatch(/later than start/i);
    expect(buildWindowPatch(lunch, '24:00', '14:30').error).toMatch(/valid times/i);
  });

  it('TC-KMS-R12-005: an unchanged field is omitted from the partial PATCH', () => {
    expect(buildWindowPatch(lunch, '11:30', '15:30')).toEqual({
      patch: { orderCutoffTime: '15:30:00' },
      error: null,
    });
    expect(buildWindowPatch(lunch, '11:30', '14:30')).toEqual({ patch: {}, error: null });
  });

  it('TC-KMS-R12-006: unchanged non-minute seconds are not accidentally written', () => {
    const saved = { ...lunch, orderStartTime: '11:30:30' };
    expect(buildWindowPatch(saved, '11:30', '15:00')).toEqual({
      patch: { orderCutoffTime: '15:00:00' },
      error: null,
    });
  });

  it('TC-KMS-R12-007: error feedback is safe and role-aware', () => {
    expect(windowUpdateError({ status: 401 })).toMatch(/session/i);
    expect(windowUpdateError({ status: 403 })).toMatch(/Kitchen Managers/i);
    expect(windowUpdateError({ status: 404 })).toMatch(/no longer exists/i);
    expect(windowUpdateError(new Error('sensitive database password'))).not.toMatch(/password/i);
  });
});
