import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { DashboardSnapshot } from '../../assets/@types/dashboard';
import type { Cheque, Invoice } from '../../../panel/assets/@types/finance';
import { DashboardContent } from './DashboardContent';

const mocks = vi.hoisted(() => ({
  DashboardCharts: vi.fn(() => <div data-testid="dashboard-charts" />),
  DashboardLists: vi.fn(() => <div data-testid="dashboard-lists" />),
  MetricCard: vi.fn(({ id }: { id: string }) => <div data-testid={`metric-${id}`} />),
}));

vi.mock('./DashboardCharts', () => ({ DashboardCharts: mocks.DashboardCharts }));
vi.mock('./DashboardLists', () => ({ DashboardLists: mocks.DashboardLists }));
vi.mock('./MetricCard', () => ({ MetricCard: mocks.MetricCard }));

const snapshot: DashboardSnapshot = {
  metrics: [
    { id: 'm1', label: 'متریک ۱', value: '1000.00', currency: 'IRR', description: '', trend: 'positive' },
    { id: 'm2', label: 'متریک ۲', value: '2000.00', currency: 'IRR', description: 'test', trend: 'negative', highlight: true },
  ],
  cashflow: [{ month: 'خرداد', income: '1000.00', expense: '500.00', currency: 'IRR' }],
  paymentMethods: [{ id: 'cash', label: 'نقد', percentage: 50 }],
  tasks: [{ id: 't1', title: 'تسک ۱', due: 'امروز' }],
};

describe('DashboardContent', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders metric cards for each metric in snapshot', () => {
    render(<DashboardContent snapshot={snapshot} invoices={[]} cheques={[]} />);

    expect(screen.getByTestId('metric-m1')).toBeInTheDocument();
    expect(screen.getByTestId('metric-m2')).toBeInTheDocument();
    expect(mocks.MetricCard).toHaveBeenCalledTimes(2);
  });

  it('renders DashboardCharts', () => {
    render(<DashboardContent snapshot={snapshot} invoices={[]} cheques={[]} />);

    expect(screen.getByTestId('dashboard-charts')).toBeInTheDocument();
    expect(mocks.DashboardCharts).toHaveBeenCalledTimes(1);
  });

  it('renders DashboardLists', () => {
    render(<DashboardContent snapshot={snapshot} invoices={[]} cheques={[]} />);

    expect(screen.getByTestId('dashboard-lists')).toBeInTheDocument();
    expect(mocks.DashboardLists).toHaveBeenCalledTimes(1);
  });

  it('passes filtered cheques (near-due and pending only) to DashboardLists', () => {
    const cheques: Cheque[] = [
      { id: 'c1', direction: 'received', sayadId: '1', counterparty: 'C1', bankName: 'Bank', amount: '100.00', currency: 'IRR', dueDate: '۱۴۰۵/۰۱/۰۱', status: 'near-due' },
      { id: 'c2', direction: 'issued', sayadId: '2', counterparty: 'C2', bankName: 'Bank', amount: '200.00', currency: 'IRR', dueDate: '۱۴۰۵/۰۱/۰۲', status: 'collected' },
      { id: 'c3', direction: 'received', sayadId: '3', counterparty: 'C3', bankName: 'Bank', amount: '300.00', currency: 'IRR', dueDate: '۱۴۰۵/۰۱/۰۳', status: 'pending' },
    ];

    render(<DashboardContent snapshot={snapshot} invoices={[] as Invoice[]} cheques={cheques} />);

    expect(mocks.DashboardLists).toHaveBeenCalledTimes(1);
    const callArgs = mocks.DashboardLists.mock.calls[0] as unknown as [{ cheques: Cheque[] }];
    expect(callArgs[0].cheques).toHaveLength(2);
    expect(callArgs[0].cheques.map((c: Cheque) => c.id)).toContain('c1');
    expect(callArgs[0].cheques.map((c: Cheque) => c.id)).toContain('c3');
    expect(callArgs[0].cheques.map((c: Cheque) => c.id)).not.toContain('c2');
  });

  it('renders section with metrics aria-label', () => {
    render(<DashboardContent snapshot={snapshot} invoices={[]} cheques={[]} />);

    const section = document.querySelector('section[aria-label="شاخص‌های مالی"]');
    expect(section).toBeInTheDocument();
  });
});
