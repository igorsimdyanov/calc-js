import { calculate, squareRoot, percent, reciprocal, accumulate, CalculatorError } from '../src/logic/arithmetic.js';

describe('вычисление', () => {
  test('суммы двух целых чисел', () => {
    expect(calculate('2', '+', '3')).toBe(5);
  });

  test('0,1 + 0,2 = 0,3 без двоичной погрешности', () => {
    expect(0.1 + 0.2).not.toBe(0.3);            // так считает сам JavaScript
    expect(0.1 + 0.2).toBeCloseTo(0.3);         // сравнение с допуском
    expect(calculate('0.1', '+', '0.2')).toBe(0.3); // калькулятор округляет
  });

  test.each([
    ['7', '*', '8', 56],
    ['10', '-', '15', -5],
    ['1', '/', '4', 0.25],
  ])('%s %s %s = %d', (a, op, b, expected) => {
    expect(calculate(a, op, b)).toBe(expected);
  });

  test('неизвестная операция — исключение', () => {
    expect(() => calculate('1', '^', '2')).toThrow('Неизвестная операция');
  });
});

describe('функция', () => {
  test('кореня из отрицательного числа — ошибка «Недопустимый ввод»', () => {
    expect(() => squareRoot('-4')).toThrow(CalculatorError);
    expect(() => squareRoot('-4')).toThrow('Недопустимый ввод');
  });

  test('процент как в калькуляторе Windows', () => {
    expect(percent('200', '+', '5')).toBe(10);
    expect(percent('200', '*', '5')).toBe(0.05);
  });

  test('обратное значение', () => {
    expect(reciprocal('4')).toBe(0.25);
  });
});

describe('память', () => {
  let memory;

  beforeEach(() => {
    memory = null; // перед каждым тестом память пуста
  });

  test('M+ к пустой памяти', () => {
    memory = accumulate(memory, '5', 1);
    expect(memory).toBe(5);
  });

  test('M− к пустой памяти', () => {
    memory = accumulate(memory, '5', -1);
    expect(memory).toBe(-5);
  });
});
