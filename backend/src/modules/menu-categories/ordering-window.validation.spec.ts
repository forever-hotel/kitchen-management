import { BadRequestException } from '@nestjs/common';

import { validateOrderingWindowPatch } from './ordering-window.validation.js';

const current = {
  name: 'Lunch',
  orderStartTime: '11:30:00',
  orderCutoffTime: '14:30:00',
};

describe('R-11 ordering-window PATCH validation', () => {
  it('TC-KMS-R11-001: accepts and normalizes valid partial and full window edits', () => {
    expect(
      validateOrderingWindowPatch({ orderStartTime: '12:00' }, current),
    ).toEqual({
      orderStartTime: '12:00:00',
    });
    expect(
      validateOrderingWindowPatch(
        { orderStartTime: '11:00:15', orderCutoffTime: '15:00' },
        current,
      ),
    ).toEqual({ orderStartTime: '11:00:15', orderCutoffTime: '15:00:00' });
  });

  it.each(['24:00', '14:60', '12:00Z', '12pm', '12:00:60', '12:00+05:30'])(
    'TC-KMS-R11-002: rejects noncanonical hotel clock value %s',
    (value) => {
      expect(() =>
        validateOrderingWindowPatch({ orderStartTime: value }, current),
      ).toThrow(BadRequestException);
    },
  );

  it('TC-KMS-R11-003: rejects equal, reverse and overnight windows', () => {
    [
      { orderStartTime: '14:30' },
      { orderStartTime: '15:30' },
      { orderStartTime: '23:00', orderCutoffTime: '02:00' },
    ].forEach((candidate) => {
      expect(() => validateOrderingWindowPatch(candidate, current)).toThrow(
        BadRequestException,
      );
    });
  });

  it('TC-KMS-R11-004: prohibits unapproved flags, names, empty and invalid PATCH shapes', () => {
    [
      { enabled: true },
      { allDay: true },
      { lastOrderMinutes: 15 },
      { name: 'New name' },
      { orderCutoffTime: null },
      {},
      [],
      null,
    ].forEach((candidate) => {
      expect(() => validateOrderingWindowPatch(candidate, current)).toThrow(
        BadRequestException,
      );
    });
  });
});
