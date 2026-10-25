export type BillingPeriod = 'month' | 'year';

export type PlanId = 'starter' | 'growth' | 'pro' | 'enterprise';

export type PricedPlanId = Exclude<PlanId, 'enterprise'>;

interface BasePlan {
  id: PlanId;
  name: string;
  tag: string;
  description: string;
  features: readonly string[];
  ctaLabel: string;
  featured?: boolean;
}

export interface PricedPlan extends BasePlan {
  id: PricedPlanId;
  kind: 'priced';
  monthlyPrice: number;
}

export interface CustomPlan extends BasePlan {
  id: 'enterprise';
  kind: 'custom';
  priceLabel: string;
  unitLabel: string;
  billedLabel: string;
}

export type Plan = PricedPlan | CustomPlan;

export interface ComparisonColumn {
  id: PlanId;
  label: string;
}

export type ComparisonValue = { kind: 'included'; label: string } | { kind: 'text'; value: string };

export interface ComparisonRow {
  label: string;
  values: readonly [ComparisonValue, ComparisonValue, ComparisonValue, ComparisonValue];
}
