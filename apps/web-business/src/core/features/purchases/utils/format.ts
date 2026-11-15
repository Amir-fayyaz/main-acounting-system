/** Format a money value with Persian digits and no decimals. */
export function formatMoney(value: string | number): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(numericValue);
}
