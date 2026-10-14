import {
  OPERATORS,
  CalculatorError,
  accumulate,
  calculate,
  negate,
  percent,
  reciprocal,
  square,
  squareRoot,
} from './arithmetic.js';
import { canonical, formatDisplay, toResultString } from './format.js';

/** Максимальное количество цифр в набираемом числе */
export const MAX_DIGITS = 15;

/** Сколько последних вычислений хранит журнал */
export const HISTORY_LIMIT = 30;

export const initialState = {
  current: '0', // число на экране (строка, десятичный разделитель — точка)
  stored: null, // первый операнд
  operator: null, // ожидающая операция: '+', '-', '*', '/'
  expression: '', // строка выражения над основным экраном
  entryLabel: null, // подпись текущего операнда в выражении, например "sqr(5)"
  overwrite: true, // следующая цифра начнёт новое число
  awaitingOperand: false, // оператор нажат, второй операнд ещё не введён
  repeat: null, // { operator, operand } — для повторного нажатия «=»
  error: null, // текст ошибки на экране
  memory: null, // значение в памяти или null
  history: [], // журнал: [{ id, expression, result }]
};

const UNARY = {
  square: { fn: square, label: (x) => `sqr(${x})` },
  sqrt: { fn: squareRoot, label: (x) => `√(${x})` },
  reciprocal: { fn: reciprocal, label: (x) => `1/(${x})` },
  negate: { fn: negate, label: (x) => `negate(${x})` },
};

const symbol = (operator) => OPERATORS[operator].symbol;
const join = (...parts) => parts.filter(Boolean).join(' ');
const countDigits = (value) => value.replace(/[-.]/g, '').length;

function pendingExpression(state) {
  return state.operator ? `${formatDisplay(state.stored)} ${symbol(state.operator)}` : '';
}

function entryText(state) {
  return state.entryLabel ?? formatDisplay(canonical(state.current));
}

function addHistory(history, expression, result) {
  const id = (history[0]?.id ?? 0) + 1;
  return [{ id, expression, result }, ...history].slice(0, HISTORY_LIMIT);
}

function reset(state) {
  return { ...initialState, memory: state.memory, history: state.history };
}

/** Начинает ввод нового числа вместо показанного на экране */
function startEntry(state, current) {
  return {
    ...state,
    current,
    overwrite: false,
    awaitingOperand: false,
    entryLabel: null,
    expression: pendingExpression(state),
  };
}

function inputDigit(state, digit) {
  if (state.error) state = reset(state);
  if (state.overwrite) return startEntry(state, digit);
  if (countDigits(state.current) >= MAX_DIGITS) return state;

  let current;
  if (state.current === '0') current = digit;
  else if (state.current === '-0') current = `-${digit}`;
  else current = state.current + digit;

  return { ...state, current };
}

function inputDecimal(state) {
  if (state.error) state = reset(state);
  if (state.overwrite) return startEntry(state, '0.');
  if (state.current.includes('.')) return state;
  return { ...state, current: `${state.current}.` };
}

function chooseOperator(state, operator) {
  if (state.error) return state;

  // Оператор нажат повторно — просто меняем его
  if (state.operator && state.awaitingOperand) {
    return { ...state, operator, expression: `${formatDisplay(state.stored)} ${symbol(operator)}` };
  }

  let stored = canonical(state.current);
  let history = state.history;

  // Цепочка вычислений: 2 + 3 × → сначала считаем 2 + 3
  if (state.operator) {
    const expression = join(pendingExpression(state), entryText(state), '=');
    stored = toResultString(calculate(state.stored, state.operator, stored));
    history = addHistory(history, expression, stored);
  }

  return {
    ...state,
    stored,
    current: stored,
    operator,
    expression: `${formatDisplay(stored)} ${symbol(operator)}`,
    entryLabel: null,
    overwrite: true,
    awaitingOperand: true,
    history,
  };
}

function equals(state) {
  if (state.error) return reset(state);

  let a, aText, operator, b, bText;
  if (state.operator) {
    // 5 + 3 =
    a = state.stored;
    aText = formatDisplay(a);
    operator = state.operator;
    b = canonical(state.current);
    bText = entryText(state);
  } else if (state.repeat) {
    // Повторное «=» повторяет последнюю операцию: 5 + 3 = = → 11
    a = canonical(state.current);
    aText = entryText(state);
    ({ operator, operand: b } = state.repeat);
    bText = formatDisplay(b);
  } else {
    return { ...state, expression: `${entryText(state)} =`, entryLabel: null, overwrite: true };
  }

  const result = toResultString(calculate(a, operator, b));
  const expression = `${aText} ${symbol(operator)} ${bText} =`;

  return {
    ...state,
    current: result,
    stored: null,
    operator: null,
    expression,
    entryLabel: null,
    overwrite: true,
    awaitingOperand: false,
    repeat: { operator, operand: b },
    history: addHistory(state.history, expression, result),
  };
}

function applyPercent(state) {
  if (state.error) return state;
  const current = toResultString(percent(state.stored, state.operator, state.current));
  return {
    ...state,
    current,
    entryLabel: null,
    overwrite: true,
    awaitingOperand: false,
    expression: join(pendingExpression(state), formatDisplay(current)),
  };
}

function applyUnary(state, name) {
  if (state.error) return state;

  const { fn, label } = UNARY[name];
  const entryLabel = label(entryText(state));
  const expression = join(pendingExpression(state), entryLabel);

  try {
    const current = toResultString(fn(state.current));
    return { ...state, current, entryLabel, expression, overwrite: true, awaitingOperand: false };
  } catch (error) {
    if (error instanceof CalculatorError) {
      return { ...state, error: error.message, expression };
    }
    throw error;
  }
}

function toggleSign(state) {
  if (state.error) return state;
  // Результат или операнд из выражения — показываем negate(x)
  if (state.overwrite) return applyUnary(state, 'negate');
  // Набираемое число — просто меняем знак
  if (state.current === '0') return state;
  const current = state.current.startsWith('-') ? state.current.slice(1) : `-${state.current}`;
  return { ...state, current };
}

function clearEntry(state) {
  if (state.error) return reset(state);
  return {
    ...state,
    current: '0',
    entryLabel: null,
    overwrite: true,
    awaitingOperand: false,
    expression: pendingExpression(state),
  };
}

function backspace(state) {
  if (state.error) return reset(state);
  if (state.overwrite) {
    // Результат не редактируется, стираем только строку выражения
    return state.operator ? state : { ...state, expression: '' };
  }
  let current = state.current.slice(0, -1);
  if (current === '' || current === '-') current = '0';
  return { ...state, current };
}

function memoryOperation(state, op) {
  if (state.error) return state;

  switch (op) {
    case 'clear':
      return { ...state, memory: null };
    case 'recall':
      if (state.memory === null) return state;
      return {
        ...state,
        current: state.memory,
        entryLabel: null,
        overwrite: true,
        awaitingOperand: false,
        expression: pendingExpression(state),
      };
    case 'add':
      return { ...state, memory: toResultString(accumulate(state.memory, state.current, 1)), overwrite: true };
    case 'subtract':
      return { ...state, memory: toResultString(accumulate(state.memory, state.current, -1)), overwrite: true };
    case 'store':
      return { ...state, memory: canonical(state.current), overwrite: true };
    default:
      return state;
  }
}

function selectHistory(state, id) {
  const entry = state.history.find((item) => item.id === id);
  if (!entry) return state;
  return { ...reset(state), current: entry.result, expression: entry.expression };
}

export function calculatorReducer(state, action) {
  switch (action.type) {
    case 'digit':
      return inputDigit(state, action.digit);
    case 'decimal':
      return inputDecimal(state);
    case 'operator':
      return chooseOperator(state, action.operator);
    case 'equals':
      return equals(state);
    case 'percent':
      return applyPercent(state);
    case 'unary':
      return applyUnary(state, action.name);
    case 'negate':
      return toggleSign(state);
    case 'clearEntry':
      return clearEntry(state);
    case 'clear':
      return reset(state);
    case 'backspace':
      return backspace(state);
    case 'memory':
      return memoryOperation(state, action.op);
    case 'historySelect':
      return selectHistory(state, action.id);
    case 'historyClear':
      return { ...state, history: [] };
    default:
      return state;
  }
}

/** Текст основного экрана */
export function displayValue(state) {
  return state.error ?? formatDisplay(state.current);
}
