export type FiscalPeriodStatus = 'open' | 'review' | 'closing' | 'closed' | 'reopened';

export interface FiscalYear {
  id: string;
  title: string;
  from: string;
  to: string;
}

export interface FiscalPeriod {
  id: string;
  yid: string;
  name: string;
  from: string;
  to: string;
  status: FiscalPeriodStatus;
}

export interface FiscalAuditLog {
  id: string;
  at: string;
  who: string;
  action: string;
  period: string;
  reason: string;
}

export interface FiscalStats {
  openCount: number;
  closedCount: number;
  totalCount: number;
}
