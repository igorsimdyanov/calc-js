/**
 * Раскладка клавиатуры калькулятора (вид «Стандартный»).
 *
 * id используется в data-testid кнопки: data-testid="btn-<id>".
 * variant управляет оформлением: digit — цифры, fn — функции,
 * op — арифметические операции, accent — кнопка «=».
 */

const digit = (d) => ({
  id: `digit-${d}`,
  label: d,
  name: d,
  variant: 'digit',
  action: { type: 'digit', digit: d },
});

const operator = (id, op, label, name) => ({
  id,
  label,
  name,
  variant: 'op',
  action: { type: 'operator', operator: op },
  blockedOnError: true,
});

export const KEYS = [
  { id: 'percent', label: '%', name: 'Процент', variant: 'fn', action: { type: 'percent' }, blockedOnError: true },
  { id: 'clear-entry', label: 'CE', name: 'Очистить ввод', variant: 'fn', action: { type: 'clearEntry' } },
  { id: 'clear', label: 'C', name: 'Очистить', variant: 'fn', action: { type: 'clear' } },
  { id: 'backspace', label: '⌫', name: 'Стереть', variant: 'fn', action: { type: 'backspace' } },

  { id: 'reciprocal', label: '¹⁄ₓ', name: 'Обратное значение', variant: 'fn', action: { type: 'unary', name: 'reciprocal' }, blockedOnError: true },
  { id: 'square', label: 'x²', name: 'Квадрат', variant: 'fn', action: { type: 'unary', name: 'square' }, blockedOnError: true },
  { id: 'sqrt', label: '²√x', name: 'Квадратный корень', variant: 'fn', action: { type: 'unary', name: 'sqrt' }, blockedOnError: true },
  operator('divide', '/', '÷', 'Разделить'),

  digit('7'), digit('8'), digit('9'),
  operator('multiply', '*', '×', 'Умножить'),

  digit('4'), digit('5'), digit('6'),
  operator('subtract', '-', '−', 'Минус'),

  digit('1'), digit('2'), digit('3'),
  operator('add', '+', '+', 'Плюс'),

  { id: 'negate', label: '+/−', name: 'Смена знака', variant: 'digit', action: { type: 'negate' }, blockedOnError: true },
  digit('0'),
  { id: 'decimal', label: ',', name: 'Десятичный разделитель', variant: 'digit', action: { type: 'decimal' }, blockedOnError: true },
  { id: 'equals', label: '=', name: 'Равно', variant: 'accent', action: { type: 'equals' } },
];

export const MEMORY_KEYS = [
  { id: 'mc', label: 'MC', name: 'Очистить память', op: 'clear', needsMemory: true },
  { id: 'mr', label: 'MR', name: 'Считать из памяти', op: 'recall', needsMemory: true },
  { id: 'm-plus', label: 'M+', name: 'Прибавить к памяти', op: 'add' },
  { id: 'm-minus', label: 'M−', name: 'Вычесть из памяти', op: 'subtract' },
  { id: 'ms', label: 'MS', name: 'Сохранить в памяти', op: 'store' },
];

/** Клавиша физической клавиатуры → id кнопки */
export const KEYBOARD_MAP = {
  0: 'digit-0',
  1: 'digit-1',
  2: 'digit-2',
  3: 'digit-3',
  4: 'digit-4',
  5: 'digit-5',
  6: 'digit-6',
  7: 'digit-7',
  8: 'digit-8',
  9: 'digit-9',
  '.': 'decimal',
  ',': 'decimal',
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '%': 'percent',
  '=': 'equals',
  Enter: 'equals',
  Backspace: 'backspace',
  Delete: 'clear-entry',
  Escape: 'clear',
  r: 'reciprocal',
  q: 'square',
  '@': 'sqrt',
  F9: 'negate',
};

export const KEYS_BY_ID = Object.fromEntries(KEYS.map((key) => [key.id, key]));
