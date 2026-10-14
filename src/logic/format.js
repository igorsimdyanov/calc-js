/**
 * Преобразование чисел для экрана.
 *
 * Внутри калькулятор хранит числа строками с точкой в качестве
 * десятичного разделителя ("1234.5"), а показывает их в русской
 * локали: "1 234,5".
 */

export const DECIMAL_SEPARATOR = ',';
export const GROUP_SEPARATOR = ' ';

/** Начиная с этого порога результат выводится в экспоненциальной форме */
const EXPONENT_THRESHOLD = 1e16;

/** Число → внутреннее строковое представление */
export function toResultString(value) {
  if (Object.is(value, -0)) {
    return '0';
  }
  if (Number.isFinite(value) && Math.abs(value) >= EXPONENT_THRESHOLD) {
    return value.toExponential();
  }
  return String(value);
}

/** Набранная строка → канонический вид: "2.50" → "2.5", "7." → "7" */
export function canonical(entry) {
  return toResultString(Number(entry));
}

/** Внутреннее строковое представление → текст для экрана */
export function formatDisplay(value) {
  const [mantissa, exponent] = value.split('e');
  const negative = mantissa.startsWith('-');
  const [intPart, fracPart] = (negative ? mantissa.slice(1) : mantissa).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);

  let text = (negative ? '-' : '') + grouped;
  if (fracPart !== undefined) {
    text += DECIMAL_SEPARATOR + fracPart;
  }
  if (exponent !== undefined) {
    text += `e${exponent}`;
  }
  return text;
}
