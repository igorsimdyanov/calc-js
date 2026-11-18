import { formatDisplay, canonical } from '../src/logic/format.js';

describe('formatDisplay', () => {
  test.each([
    ['0', '0'],
    ['1234', '1 234'],
    ['1234567.5', '1 234 567,5'],
    ['-1000', '-1 000'],
    ['1e+16', '1e+16'],
  ])('%s → %s', (input, expected) => {
    expect(formatDisplay(input)).toBe(expected);
  });
});

describe('canonical', () => {
  test('убирает лишние нули и точку', () => {
    expect(canonical('2.50')).toBe('2.5');
    expect(canonical('7.')).toBe('7');
  });
});
