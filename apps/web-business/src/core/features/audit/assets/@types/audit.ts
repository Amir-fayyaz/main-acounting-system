export type AuditOutcome = 'موفق' | 'ناموفق';

export interface AuditEvent {
  id: string;
  at: string;
  who: string;
  action: string;
  target: string;
  out: AuditOutcome;
}

export interface ListAuditParams {
  page?: number;
  limit?: number;
  search?: string;
  outcome?: string;
}
