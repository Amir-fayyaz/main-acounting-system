'use client';

import { useState } from 'react';

import type { BillingPeriod } from '@/core/features/pricing/assets/@types/pricing';
import { plans } from '@/core/features/pricing/assets/mock/pricing';
import { BillingToggle } from '@/core/features/pricing/components/ui/billing-toggle/BillingToggle';
import { PlanCard } from '@/core/features/pricing/components/ui/plan-card/PlanCard';
import { getBillingSummary } from '@/core/features/pricing/lib/pricing';
import { P } from '@/core/components/custom/ui/typography/Typography';

export function PricingPlans() {
  const [period, setPeriod] = useState<BillingPeriod>('month');

  return (
    <>
      <BillingToggle period={period} onPeriodChange={setPeriod} />

      <P
        aria-live="polite"
        className="mb-5 text-center text-xs text-[#746b60]"
      >
        {getBillingSummary(period)}
      </P>

      <section aria-label="پلن‌های نمونه">
        <ul className="m-0 grid list-none grid-cols-4 items-stretch gap-[15px] p-0 max-[1100px]:gap-3 max-[600px]:grid-cols-1 max-[600px]:gap-[17px] max-[900px]:grid-cols-2 max-[900px]:gap-[18px]">
          {plans.map((plan) => (
            <li key={plan.id} className="flex min-w-0">
              <PlanCard plan={plan} period={period} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
