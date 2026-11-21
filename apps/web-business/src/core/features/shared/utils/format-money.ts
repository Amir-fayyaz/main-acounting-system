import { DECIMAL_SEPARATOR, THOUSANDS_SEPARATOR, toFaDigits } from './persian-digits';
import { isCanonicalMoney } from './money-input';

const moneyFormatter = new Intl.NumberFormat('fa-IR');
const INTEGER_PATTERN = /^[+-]?\d+$/;

/** Formats a money string as grouped Persian digits; empty renders zero and malformed input is returned unchanged. */
export function formatMoney(amount: string): string {
  const integerPart = amount.split('.')[0].trim();
  if (integerPart === '') return '۰';
  if (!INTEGER_PATTERN.test(integerPart)) return amount;
  return moneyFormatter.format(BigInt(integerPart));
}

/** نمایش مبلغ canonical با جداکننده‌ی هزارگان و ارقام فارسی؛ اعشار صفر حذف می‌شود. */
export function formatMoneyFa(amount: string): string {
  if (!isCanonicalMoney(amount)) return toFaDigits(amount);

  const [integerPart = '0', fractionPart = '00'] = amount.split('.');
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  const fraction = fractionPart === '00' ? '' : `${DECIMAL_SEPARATOR}${fractionPart}`;

  return toFaDigits(`${grouped}${fraction}`);
}
