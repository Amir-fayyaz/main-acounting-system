const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeDigits(input: string): string {
  return input
    .replace(/[۰-۹٠-٩]/g, (digit) => {
      const persianIndex = PERSIAN_DIGITS.indexOf(digit);
      if (persianIndex >= 0) return String(persianIndex);

      return String(ARABIC_DIGITS.indexOf(digit));
    })
    .replace(/[\s-]/g, '');
}
