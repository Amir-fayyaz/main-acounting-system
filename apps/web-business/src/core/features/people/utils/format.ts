const PERSIAN_NUMBER_FORMATTER = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });

export function formatMoney(value: string | number): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return PERSIAN_NUMBER_FORMATTER.format(numericValue);
}
