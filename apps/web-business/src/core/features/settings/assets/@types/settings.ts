export type Currency = 'IRR' | 'TOMAN';

export interface CompanyInfo {
  companyName: string;
  nationalId: string;
  fiscalYearStart: string;
  currency: Currency;
}

export interface AccountingRules {
  autoNumbering: boolean;
  balanceControl: boolean;
  autoInvoiceJournal: boolean;
  preventDuplicateTransactions: boolean;
}

export type PeriodStatus = 'open' | 'closed' | 'no-period';

export interface FiscalSummary {
  yearTitle: string;
  periodName: string;
  periodStatus: PeriodStatus;
  warning?: string;
}

export interface Settings {
  company: CompanyInfo;
  rules: AccountingRules;
  fiscal: FiscalSummary;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  company?: Partial<CompanyInfo>;
  rules?: Partial<AccountingRules>;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export type CompanyErrors = FieldErrors<CompanyInfo>;

export type SettingsStatus = 'loading' | 'success' | 'error';
