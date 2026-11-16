import { BadRequestException } from '@nestjs/common';
import { validateOrderingEnabledChange } from './ordering-enabled.validation.js';

describe('DDP-268 ordering availability validation', () => {
  it('accepts explicit true and false', () => {
    expect(validateOrderingEnabledChange({ orderingEnabled: false })).toEqual({
      orderingEnabled: false,
    });
    expect(validateOrderingEnabledChange({ orderingEnabled: true })).toEqual({
      orderingEnabled: true,
    });
  });
  it.each([
    {},
    { orderingEnabled: 0 },
    { orderingEnabled: 'false' },
    { orderingEnabled: false, name: 'Lunch' },
    [],
    null,
  ])('rejects unsupported values: %p', (value) => {
    expect(() => validateOrderingEnabledChange(value)).toThrow(
      BadRequestException,
    );
  });
});
