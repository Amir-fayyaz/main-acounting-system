import type { CurrencyCode, Money } from './common';

export interface DashboardMetric {
  id: string;
  label: string;
  value: Money;
  currency: CurrencyCode;
  description: string;
  trend?: 'positive' | 'negative' | 'neutral';
  highlight?: boolean;
}

export interface CashflowMonth {
  month: string;
  income: Money;
  expense: Money;
  currency: CurrencyCode;
}

export interface PaymentMethodShare {
  id: string;
  label: string;
  percentage: number;
}

export interface DashboardTask {
  id: string;
  title: string;
  due: string;
}

export interface DashboardSnapshot {
  metrics: DashboardMetric[];
  cashflow: CashflowMonth[];
  paymentMethods: PaymentMethodShare[];
  tasks: DashboardTask[];
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  status: 'success' | 'pending' | 'warning';
}
