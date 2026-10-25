import { PricingComparison } from '@/core/features/landing/components/block/pricing/comparison/PricingComparison';
import { PricingCta } from '@/core/features/landing/components/block/pricing/cta/PricingCta';
import { PricingHero } from '@/core/features/landing/components/block/pricing/hero/PricingHero';
import { PricingPlans } from '@/core/features/landing/components/block/pricing/plans/PricingPlans';

export function PricingPage() {
  return (
    <main>
      <PricingHero />
      <PricingPlans />
      <PricingComparison />
      <PricingCta />
    </main>
  );
}
