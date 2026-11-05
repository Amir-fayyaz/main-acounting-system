import type { CurrencyCode, Money } from './common';

export interface DashboardMetric {
  id: string;
  label: string;
  value: Money;
  currency: CurrencyCode;
  description: string;
  trend?: 'positive' | 'negative' | 'neutral';
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

export interface DashboardSnapshot {
  metrics: DashboardMetric[];
  cashflow: CashflowMonth[];
  paymentMethods: PaymentMethodShare[];
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  occurredAt: string;
  status: 'success' | 'pending' | 'warning';
}
