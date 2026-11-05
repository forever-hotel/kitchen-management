import {
  normalizeCreateCategory,
  normalizeCategoryTime,
  validateCreateCategory,
} from './create-category.validation';

const valid = {
  name: '  Brunch  ',
  orderStartTime: '09:30',
  orderCutoffTime: '11:30',
};

describe('R-06 category input validation', () => {
  it('normalizes only category write contract fields', () => {
    expect(normalizeCreateCategory(valid)).toEqual({
      name: 'Brunch',
      orderStartTime: '09:30:00',
      orderCutoffTime: '11:30:00',
    });
  });

  it.each(['24:00', '12:60', '12:12:60', '9:30', 'text'])('rejects invalid time %s', (time) => {
    expect(normalizeCategoryTime(time)).toBeNull();
  });

  it('rejects blank and overlong names', () => {
    expect(validateCreateCategory({ ...valid, name: ' ' })).toMatch(/required/);
    expect(validateCreateCategory({ ...valid, name: 'A'.repeat(101) })).toMatch(/100/);
  });

  it('rejects overnight or zero-duration windows', () => {
    expect(validateCreateCategory({ ...valid, orderCutoffTime: '09:30' })).toMatch(/after start/);
    expect(validateCreateCategory({ ...valid, orderCutoffTime: '08:00' })).toMatch(/after start/);
  });
});
