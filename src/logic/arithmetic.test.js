import { describe, expect, it } from 'vitest';
import { CalculatorError, calculate, squareRoot } from './arithmetic.js';
import { formatDisplay } from './format.js';

// Примеры модульных тестов. Дополните их своими сценариями.

describe('calculate', () => {
  it('складывает целые числа', () => {
    expect(calculate('2', '+', '3')).toBe(5);
  });

  it('умножает целые числа', () => {
    expect(calculate('7', '*', '8')).toBe(56);
  });

  it('складывает дробные числа без двоичной погрешности', () => {
    expect(calculate('0.1', '+', '0.2')).toBe(0.3);
  });
});

describe('squareRoot', () => {
  it('извлекает квадратный корень', () => {
    expect(squareRoot('9')).toBe(3);
  });

  it('не принимает отрицательные числа', () => {
    expect(() => squareRoot('-4')).toThrow(CalculatorError);
  });
});

describe('formatDisplay', () => {
  it('разбивает число на разряды и ставит десятичную запятую', () => {
    expect(formatDisplay('1234567.5')).toBe('1 234 567,5');
  });
});
