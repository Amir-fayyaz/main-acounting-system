import { formatMoney } from '../../shared/utils/format-money';
import { toFaDigits } from '../../shared/utils/persian-digits';

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);
const ONE_MILLION = BigInt(1000000);
const ONE_BILLION = BigInt(1000000000);
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const INTEGER_PATTERN = /^[+-]?\d+$/;

/**
 * Scales `value` by `divisor` into a Persian label with at most one decimal digit.
 *
 * Within `Number.MAX_SAFE_INTEGER` the rounding matches the prototype exactly
 * (`fa(n)` = `toLocaleString('fa-IR', { maximumFractionDigits: 1 })`), so
 * exact-half decimals such as `1.45` round the same way. Larger inputs keep
 * exact BigInt half-up rounding so values beyond the double range are never
 * approximated.
 */
function scaledLabel(value: bigint, divisor: bigint): string {
  if (value <= MAX_SAFE) {
    return (Number(value) / Number(divisor)).toLocaleString('fa-IR', {
      maximumFractionDigits: 1,
    });
  }

  const whole = value / divisor;
  const remainder = value % divisor;
  // Round half up to one decimal digit, carrying into the whole part.
  let tenths = (remainder * TEN + divisor / TWO) / divisor;
  let rounded = whole;
  if (tenths === TEN) {
    rounded += ONE;
    tenths = ZERO;
  }
  const grouped = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  const wholeText = toFaDigits(grouped);
  return tenths === ZERO ? wholeText : `${wholeText}٫${toFaDigits(tenths.toString())}`;
}

/**
 * Formats an IRR amount as a compact Persian label (prototype `short()`):
 * `۴۸٫۲ میلیارد ریال`, `۵ میلیون ریال`, or full `ریال` below one million.
 * Malformed input is returned unchanged instead of throwing.
 */
export function formatShortMoney(amount: string | number): string {
  const raw = typeof amount === 'number' ? String(amount) : amount;
  const integerPart = raw.split('.')[0].trim();
  if (!INTEGER_PATTERN.test(integerPart)) return raw;

  const negative = integerPart.startsWith('-');
  const abs = BigInt(negative ? integerPart.slice(1) : integerPart);

  let body: string;
  if (abs >= ONE_BILLION) {
    body = `${scaledLabel(abs, ONE_BILLION)} میلیارد ریال`;
  } else if (abs >= ONE_MILLION) {
    body = `${scaledLabel(abs, ONE_MILLION)} میلیون ریال`;
  } else {
    body = `${formatMoney(raw)} ریال`;
  }

  return negative && abs > ZERO ? `-${body}` : body;
}

export function splitShortMoney(label: string): { amount: string; unit: string } {
  const separator = label.indexOf(' ');
  if (separator === -1) return { amount: label, unit: '' };
  return { amount: label.slice(0, separator), unit: label.slice(separator + 1) };
}
