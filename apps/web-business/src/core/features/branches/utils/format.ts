const PERSIAN_NUMBER_FORMATTER = new Intl.NumberFormat('fa-IR');
const PERSIAN_PLAIN_NUMBER_FORMATTER = new Intl.NumberFormat('fa-IR', { useGrouping: false });

export function formatBranchAmount(value: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  return PERSIAN_NUMBER_FORMATTER.format(numericValue);
}

export function formatBranchCode(value: string): string {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return value;
  return PERSIAN_PLAIN_NUMBER_FORMATTER.format(numericValue);
}

export function formatBranchCount(value: number): string {
  return PERSIAN_NUMBER_FORMATTER.format(value);
}
