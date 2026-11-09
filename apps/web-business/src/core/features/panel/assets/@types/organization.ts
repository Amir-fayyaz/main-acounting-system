import type { CurrencyCode, Money } from './common';

export interface Person {
  id: string;
  name: string;
  kind: 'customer' | 'supplier' | 'both';
  phone: string;
  branchName: string;
  receivable: Money;
  payable: Money;
  currency: CurrencyCode;
}

export interface Branch {
  id: string;
  code: string;
  name: string;
  managerName: string;
  cashRegisterCount: number;
  userCount: number;
  monthlySales: Money;
  currency: CurrencyCode;
  status: 'active' | 'inactive';
}

export interface PanelUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branchName: string;
  status: 'active' | 'inactive';
}

export interface AuditEvent {
  id: string;
  occurredAt: string;
  actorName: string;
  action: string;
  target: string;
  result: 'success' | 'failure';
}
