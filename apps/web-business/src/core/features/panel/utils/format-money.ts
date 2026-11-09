const moneyFormatter = new Intl.NumberFormat('fa-IR');
const INTEGER_PATTERN = /^[+-]?\d+$/;

/** Formats a money string as grouped Persian digits; empty renders zero and malformed input is returned unchanged. */
export function formatMoney(amount: string): string {
  const integerPart = amount.split('.')[0].trim();
  if (integerPart === '') return '۰';
  if (!INTEGER_PATTERN.test(integerPart)) return amount;
  return moneyFormatter.format(BigInt(integerPart));
}
