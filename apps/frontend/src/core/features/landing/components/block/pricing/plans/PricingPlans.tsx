'use client';

import { Info } from 'lucide-react';
import { pricingNote } from '@/core/features/landing/assets/mock/pricing';

import { useState } from 'react';

import type { BillingPeriod } from '@/core/features/landing/assets/@types/pricing';
import { plans } from '@/core/features/landing/assets/mock/pricing';
import { BillingToggle } from '@/core/features/landing/components/ui/pricing/BillingToggle';
import { PlanCard } from '@/core/features/landing/components/ui/pricing/PlanCard';
import { getBillingSummary } from '@/core/features/landing/lib/pricing';
import { P } from '@/core/components/custom/ui/typography/Typography';

export function PricingPlans() {
  const [period, setPeriod] = useState<BillingPeriod>('month');

  return (
    <section className="pb-8">
      <div aria-label="پلن‌های نمونه">
        <BillingToggle period={period} onPeriodChange={setPeriod} />

        <P aria-live="polite" className="mb-5 text-center text-xs text-[#746b60]">
          {getBillingSummary(period)}
        </P>

        <ul className="m-0 grid list-none grid-cols-4 items-stretch gap-3.5 p-0 max-xl:gap-3 max-sm:grid-cols-1 max-sm:gap-4 max-lg:grid-cols-2 max-lg:gap-4">
          {plans.map((plan) => (
            <li key={plan.id} className="flex min-w-0">
              <PlanCard plan={plan} period={period} />
            </li>
          ))}
        </ul>
        <P className="mt-5 flex items-start justify-start gap-2 text-xs leading-loose text-muted-foreground sm:justify-center">
          <Info aria-hidden="true" strokeWidth={1.7} className="mt-0.5 size-3.5 shrink-0" />
          {pricingNote}
        </P>
      </div>
    </section>
  );
}
