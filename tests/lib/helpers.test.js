const { number3 } = require('../../src/lib/helpers');

describe('number3', () => {
  it('formats a number to 3 decimal places', () => {
    expect(number3(0.5)).toBe('0.500');
    expect(number3(1.20345)).toBe('1.203');
  });

  it('returns a dash for non-numeric or NaN input', () => {
    expect(number3(NaN)).toBe('-');
    expect(number3(undefined)).toBe('-');
    expect(number3('not a number')).toBe('-');
  });
});
