/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',          // логика калькулятора не трогает DOM
  roots: ['<rootDir>/tests'],       // Jest ищет тесты только в папке tests/
  collectCoverageFrom: ['src/logic/**/*.js', '!src/**/*.test.js'],
};
