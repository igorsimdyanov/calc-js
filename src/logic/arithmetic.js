/**
 * Арифметическое ядро калькулятора.
 *
 * Операнды приходят строками в том виде, в каком их хранит калькулятор
 * ("12", "-3.5", "0.25"), результат возвращается числом.
 */

export const OPERATORS = {
  '+': { symbol: '+', name: 'Плюс' },
  '-': { symbol: '−', name: 'Минус' },
  '*': { symbol: '×', name: 'Умножить на' },
  '/': { symbol: '÷', name: 'Разделить на' },
};

/** Количество значащих цифр в результате */
const PRECISION = 15;

/** Ошибка, которую калькулятор показывает пользователю на экране */
export class CalculatorError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CalculatorError';
  }
}

/** Убирает «хвосты» двоичной арифметики: 0.1 + 0.2 → 0.3 */
export function normalize(value) {
  return parseFloat(value.toPrecision(PRECISION));
}

const isInteger = (operand) => Number.isInteger(Number(operand));
const toInteger = (operand) => Math.trunc(Number(operand));
const toFloat = (operand) => Number(operand);

/**
 * Разбирает операнды бинарной операции. Целочисленная арифметика
 * не накапливает погрешность, поэтому к дробной переходим только тогда,
 * когда без неё не обойтись.
 */
function parseOperands(a, b) {
  if (!isInteger(a) && !isInteger(b)) {
    return [toFloat(a), toFloat(b)];
  }
  return [toInteger(a), toInteger(b)];
}

/** Бинарная операция: calculate('2', '+', '3') → 5 */
export function calculate(a, operator, b) {
  const [x, y] = parseOperands(a, b);

  switch (operator) {
    case '+':
      return normalize(x + y);
    case '-':
      return normalize(x - y);
    case '*':
      return normalize(x * y);
    case '/':
      return normalize(x / y);
    default:
      throw new Error(`Неизвестная операция: ${operator}`);
  }
}

/** x² */
export function square(a) {
  const x = Number(a);
  return normalize(x * x);
}

/** √x */
export function squareRoot(a) {
  const x = Number(a);
  if (x < 0) {
    throw new CalculatorError('Недопустимый ввод');
  }
  return normalize(Math.sqrt(x));
}

/** 1/x */
export function reciprocal(a) {
  return normalize(1 / Number(a));
}

/** +/− */
export function negate(a) {
  return normalize(-Number(a));
}

/**
 * Процент, как в стандартном калькуляторе Windows:
 *   200 + 5 %  → второй операнд становится 10 (5 % от 200);
 *   200 × 5 %  → второй операнд становится 0.05;
 *   50 %       → 0.5.
 */
export function percent(base, operator, value) {
  const x = Number(value);
  if (operator === '+' || operator === '-') {
    return normalize((Number(base) * x) / 100);
  }
  return normalize(x / 100);
}

/** Прибавляет значение к ячейке памяти (sign = 1 для M+, −1 для M−) */
export function accumulate(memory, value, sign) {
  return normalize(Number(memory ?? 0) + sign * Number(value));
}
