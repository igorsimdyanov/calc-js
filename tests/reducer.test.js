import { jest } from '@jest/globals';
import { calculatorReducer, initialState, displayValue } from '../src/logic/reducer.js';

// Нажимаем кнопки по очереди — так же, как пользователь
const press = (...actions) => actions.reduce(calculatorReducer, initialState);
const digit = (d) => ({ type: 'digit', digit: d });
const op = (o) => ({ type: 'operator', operator: o });
const equals = { type: 'equals' };

describe('сценарии нажатий', () => {
  test('12 + 30 = 42', () => {
    const state = press(digit('1'), digit('2'), op('+'), digit('3'), digit('0'), equals);
    expect(displayValue(state)).toBe('42');
    expect(state.expression).toBe('12 + 30 =');
  });

  test('цепочка слева направо: 2 + 3 × 4 = 20', () => {
    const state = press(digit('2'), op('+'), digit('3'), op('*'), digit('4'), equals);
    expect(displayValue(state)).toBe('20');
  });

  // Дефект: требование «Деление на ноль невозможно» не выполняется (TC-ERR-02)
  test.failing('деление на ноль', () => {
    const state = press(digit('5'), op('/'), digit('0'), equals);
    expect(displayValue(state)).toBe('Деление на ноль невозможно');
  });

  test('вычисление попадает в журнал', () => {
    const state = press(digit('2'), op('+'), digit('2'), equals);
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toEqual({ id: 1, expression: '2 + 2 =', result: '4' });
  });
});

describe('шпион', () => {
  afterEach(() => jest.restoreAllMocks());

  test('корень считается через Math.sqrt', () => {
    const spy = jest.spyOn(Math, 'sqrt');
    press(digit('9'), { type: 'unary', name: 'sqrt' });
    expect(spy).toHaveBeenCalledWith(9);
  });
});
