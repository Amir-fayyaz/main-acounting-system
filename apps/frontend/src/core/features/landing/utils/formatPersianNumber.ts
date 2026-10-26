const persianNumberFormatter = new Intl.NumberFormat('fa-IR');

export function formatPersianNumber(value: number): string {
  return persianNumberFormatter.format(value);
}
