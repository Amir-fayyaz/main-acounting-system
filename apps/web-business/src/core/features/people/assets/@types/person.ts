/** Currency codes supported by person money values. */
export type CurrencyCode = 'IRR';

/** Money is always a decimal string — never a JS `number`. */
export type Money = string;

/** Party role shown in the list and the kind filter. */
export type PersonKind = 'مشتری' | 'تأمین‌کننده' | 'هر دو';

export interface Person {
  id: string;
  /** Party name. */
  name: string;
  /** Customer / supplier / both. */
  kind: PersonKind;
  /** Phone number. */
  phone: string;
  /** Branch. */
  branch: string;
  /** Receivables (مطالبات). */
  recv: Money;
  /** Payables (بدهی). */
  pay: Money;
  currency: CurrencyCode;
}

/** Fields the person form collects; the service fills the remaining defaults. */
export interface CreatePersonInput {
  name: string;
  kind: PersonKind;
  phone: string;
}

/** One sort criterion; the array order is the priority order. */
export interface PersonSortItem {
  id: string;
  desc: boolean;
}

/** Filters accepted by the person list endpoint. */
export interface ListPeopleParams {
  /** 1-based page number. */
  page?: number;
  /** Page size, `1–100`. */
  limit?: number;
  /** Free-text search over name, kind, phone and branch. */
  search?: string;
  /** Raw party kind, or an empty string for "all". */
  kind?: string;
  /** Multi-column sort, highest priority first. */
  sort?: PersonSortItem[];
}
