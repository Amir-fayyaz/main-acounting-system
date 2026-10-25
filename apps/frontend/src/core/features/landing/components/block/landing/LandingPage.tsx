import { CapabilitiesSection } from '@/core/features/landing/components/block/capabilities/CapabilitiesSection';
import { CompaniesSection } from '@/core/features/landing/components/block/companies/CompaniesSection';
import { FinalCta, MiniCta } from '@/core/features/landing/components/block/cta/CtaSections';
import { Hero } from '@/core/features/landing/components/block/hero/Hero';
import { IntelligenceSection } from '@/core/features/landing/components/block/intelligence/IntelligenceSection';
import { OutcomesSection } from '@/core/features/landing/components/block/outcomes/OutcomesSection';
import { ScopeSection } from '@/core/features/landing/components/block/scope/ScopeSection';
import { ConnectedSection } from '@/core/features/landing/components/block/workflow/ConnectedSection';

export function LandingPage() {
  return (
    <div>
      <Hero />
      <CompaniesSection />
      <CapabilitiesSection />
      <ConnectedSection />
      <OutcomesSection />
      <IntelligenceSection />
      <ScopeSection />
      <MiniCta />
      <FinalCta />
    </div>
  );
}
