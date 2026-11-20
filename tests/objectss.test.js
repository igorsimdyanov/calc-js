import { readFile } from 'node:fs/promises';
import { OPERATORS } from '../src/logic/arithmetic.js';
import { calculatorReducer, initialState } from '../src/logic/reducer.js';

const press = (...actions) => actions.reduce(calculatorReducer, initialState);
const digit = (d) => ({ type: 'digit', digit: d });
const op = (o) => ({ type: 'operator', operator: o });
const equals = { type: 'equals' };

const state = press(digit('1'), digit('2'), op('+'), digit('3'), digit('0'), equals);

describe('объекты и массивы', () => {
  test('toMatchObject — проверяем только нужные поля', () => {
    expect(state).toMatchObject({ current: '42', operator: null, error: null });
  });

  test('toHaveProperty — поле и его значение', () => {
    expect(state).toHaveProperty('memory', null);
    expect(OPERATORS).toHaveProperty(['*', 'symbol'], '×');
  });

  test('toContainEqual — элемент массива по содержимому', () => {
    expect(state.history).toContainEqual({ id: 1, expression: '12 + 30 =', result: '42' });
  });

  test('toEqual не различает undefined-поля, toStrictEqual — различает', () => {
    expect({ a: 1, b: undefined }).toEqual({ a: 1 });
    expect({ a: 1, b: undefined }).not.toStrictEqual({ a: 1 });
  });
});

describe('асинхронный код', () => {
  test('версия в package.json по SemVer', async () => {
    const pkg = JSON.parse(await readFile('package.json', 'utf-8'));
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('resolves и rejects', async () => {
    await expect(readFile('package.json', 'utf-8')).resolves.toContain('"name": "calc"');
    await expect(readFile('нет-такого-файла.json')).rejects.toThrow('ENOENT');
  });
});

describe('снапшот', () => {
  test('состояние после 12 + 30 =', () => {
    expect(state).toMatchSnapshot();
  });
});
