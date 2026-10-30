const STATUS_LABELS: Record<string, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  pending: 'در انتظار',
  suspended: 'معلق',
};

/** Map backend lifecycle status to a Persian label for the table. */
export function memberStatusLabel(status: string): string {
  const key = status.trim().toLowerCase();
  return STATUS_LABELS[key] ?? status;
}
