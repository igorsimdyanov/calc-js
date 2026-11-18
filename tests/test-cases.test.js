import { calculatorReducer, initialState, displayValue } from '../src/logic/reducer.js';

// Действия — те же объекты, что отправляют кнопки (src/components/keys.js)
const press = (...actions) => actions.reduce(calculatorReducer, initialState);
const digit = (d) => ({ type: 'digit', digit: d });
const decimal = { type: 'decimal' };

// Тест-кейсы из docs/test-cases-short.md: ID — в названии теста
describe('ввод чисел', () => {
  test('TC-INP-02: ведущие нули не допускаются', () => {
    const state = press(digit('0'), digit('0'), digit('0'), digit('5'));
    expect(displayValue(state)).toBe('5');
  });

  test('TC-INP-04: разделитель в начале числа', () => {
    const state = press(decimal, digit('5'));
    expect(displayValue(state)).toBe('0,5');
  });

  test('TC-INP-05: второй разделитель игнорируется', () => {
    let state = press(digit('1'), decimal, digit('2'));   // шаг 1
    expect(displayValue(state)).toBe('1,2');
    state = calculatorReducer(state, decimal);            // шаг 2
    expect(displayValue(state)).toBe('1,2');
    state = calculatorReducer(state, digit('3'));         // шаг 3
    expect(displayValue(state)).toBe('1,23');
  });

  test('TC-INP-06: не более 15 цифр в целом числе', () => {
    const state = press(...'1234567890123456'.split('').map(digit));
    expect(displayValue(state)).toBe('123 456 789 012 345');
  });
});
