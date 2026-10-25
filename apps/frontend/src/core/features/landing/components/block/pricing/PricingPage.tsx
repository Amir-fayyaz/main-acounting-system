import { Info } from 'lucide-react';

import { pricingNote } from '@/core/features/landing/assets/mock/pricing';
import { PricingComparison } from '@/core/features/landing/components/block/pricing/comparison/PricingComparison';
import { PricingCta } from '@/core/features/landing/components/block/pricing/cta/PricingCta';
import { PricingHero } from '@/core/features/landing/components/block/pricing/hero/PricingHero';
import { PricingPlans } from '@/core/features/landing/components/block/pricing/plans/PricingPlans';
import { P } from '@/core/components/custom/ui/typography/Typography';

export function PricingPage() {
  return (
    <div className="pricing-root">
      <div className="pricing-container">
        <PricingHero />
        <PricingPlans />

        <P className="mt-[21px] flex items-start justify-center gap-[7px] text-[10px] leading-[2] text-[#7e6c51] max-[600px]:justify-start max-[600px]:text-[9px]">
          <Info aria-hidden="true" strokeWidth={1.7} className="mt-[2px] size-[14px] shrink-0" />
          {pricingNote}
        </P>

        <PricingComparison />
        <PricingCta />
      </div>
    </div>
  );
}
