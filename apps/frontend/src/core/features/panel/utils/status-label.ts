import type {
  ActivityItem,
  AuditEvent,
  Cheque,
  JournalEntry,
  PaymentStatus,
  Person,
  RecordStatus,
} from '../assets/@types';

/** Maps a status to its Persian label, returning the original value for unknown statuses. */
function mapStatusLabel(labels: Record<string, string>, status: string): string {
  const key = status.trim().toLowerCase();
  return Object.hasOwn(labels, key) ? labels[key] : status;
}

const RECORD_STATUS_LABELS = {
  active: 'فعال',
  inactive: 'غیرفعال',
} as const satisfies Record<RecordStatus, string>;

const PAYMENT_STATUS_LABELS = {
  settled: 'تسویه‌شده',
  'partially-settled': 'تسویه جزئی',
  unsettled: 'تسویه‌نشده',
} as const satisfies Record<PaymentStatus, string>;

const CHEQUE_STATUS_LABELS = {
  pending: 'در انتظار',
  collected: 'وصول‌شده',
  'near-due': 'نزدیک سررسید',
  returned: 'برگشتی',
  overdue: 'معوق',
  endorsed: 'ظهرنویسی‌شده',
} as const satisfies Record<Cheque['status'], string>;

export const JOURNAL_STATUS_LABELS = {
  balanced: 'تراز',
  draft: 'پیش‌نویس',
} as const satisfies Record<JournalEntry['status'], string>;

const AUDIT_RESULT_LABELS = {
  success: 'موفق',
  failure: 'ناموفق',
} as const satisfies Record<AuditEvent['result'], string>;

const ACTIVITY_STATUS_LABELS = {
  success: 'موفق',
  pending: 'در انتظار',
  warning: 'نیازمند بررسی',
} as const satisfies Record<ActivityItem['status'], string>;

const PERSON_KIND_LABELS = {
  customer: 'مشتری',
  supplier: 'تأمین‌کننده',
  both: 'مشتری و تأمین‌کننده',
} as const satisfies Record<Person['kind'], string>;

export function recordStatusLabel(status: string): string {
  return mapStatusLabel(RECORD_STATUS_LABELS, status);
}

export function paymentStatusLabel(status: string): string {
  return mapStatusLabel(PAYMENT_STATUS_LABELS, status);
}

export function chequeStatusLabel(status: string): string {
  return mapStatusLabel(CHEQUE_STATUS_LABELS, status);
}

export function journalStatusLabel(status: string): string {
  return mapStatusLabel(JOURNAL_STATUS_LABELS, status);
}

export function auditResultLabel(result: string): string {
  return mapStatusLabel(AUDIT_RESULT_LABELS, result);
}

export function activityStatusLabel(status: string): string {
  return mapStatusLabel(ACTIVITY_STATUS_LABELS, status);
}

export function personKindLabel(kind: string): string {
  return mapStatusLabel(PERSON_KIND_LABELS, kind);
}
