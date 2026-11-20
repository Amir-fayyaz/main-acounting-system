import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { DashboardMetric } from '../../assets/@types/dashboard';
import { MetricCard } from './MetricCard';

const baseMetric: DashboardMetric = {
  id: 'test-metric',
  label: 'متریک تست',
  value: '48200000000.00',
  currency: 'IRR',
  description: '۳٫۱٪ بیشتر از ماه قبل',
  trend: 'positive',
  highlight: true,
};

describe('MetricCard', () => {
  it('renders metric label, value, and description', () => {
    render(<MetricCard {...baseMetric} />);

    expect(screen.getByText('متریک تست')).toBeInTheDocument();
    expect(screen.getByText('۴۸٫۲')).toBeInTheDocument();
    expect(screen.getByText('۳٫۱٪ بیشتر از ماه قبل')).toBeInTheDocument();
  });

  it('applies bg-accent when highlight is true', () => {
    render(<MetricCard {...baseMetric} />);

    const card = screen.getByText('متریک تست').closest('[data-slot="card"]');
    expect(card).toHaveClass('bg-accent');
  });

  it('does not apply bg-accent when highlight is false', () => {
    render(<MetricCard {...{ ...baseMetric, highlight: false }} />);

    const card = screen.getByText('متریک تست').closest('[data-slot="card"]');
    expect(card).not.toHaveClass('bg-accent');
  });

  it('applies text-success for positive trend', () => {
    render(<MetricCard {...{ ...baseMetric, trend: 'positive' }} />);

    expect(screen.getByText('۳٫۱٪ بیشتر از ماه قبل')).toHaveClass('text-success');
  });

  it('applies text-destructive for negative trend', () => {
    render(<MetricCard {...{ ...baseMetric, trend: 'negative' }} />);

    expect(screen.getByText('۳٫۱٪ بیشتر از ماه قبل')).toHaveClass('text-destructive');
  });

  it('renders without description when description is empty', () => {
    render(<MetricCard {...{ ...baseMetric, description: '' }} />);

    expect(screen.getByText('متریک تست')).toBeInTheDocument();
    expect(screen.queryByText('۳٫۱٪ بیشتر از ماه قبل')).not.toBeInTheDocument();
  });

  it('renders amount and unit separately', () => {
    render(<MetricCard {...baseMetric} />);

    const card = within(screen.getByText('متریک تست').closest('[data-slot="card"]')!);
    expect(card.getByText('۴۸٫۲')).toBeInTheDocument();
    expect(card.getByText('میلیارد ریال')).toBeInTheDocument();
  });
});
