import { CapabilitiesSection } from '@/core/features/landing/components/block/home/capabilities/CapabilitiesSection';
import { CompaniesSection } from '@/core/features/landing/components/block/home/companies/CompaniesSection';
import { FinalCta, MiniCta } from '@/core/features/landing/components/block/shared/cta/CtaSections';
import { Hero } from '@/core/features/landing/components/block/home/hero/Hero';
import { IntelligenceSection } from '@/core/features/landing/components/block/shared/intelligence/IntelligenceSection';
import { OutcomesSection } from '@/core/features/landing/components/block/home/outcomes/OutcomesSection';
import { ScopeSection } from '@/core/features/landing/components/block/home/scope/ScopeSection';
import { ConnectedSection } from '@/core/features/landing/components/block/shared/workflow/ConnectedSection';

export function LandingPage() {
  return (
    <main>
      <Hero />
      <CompaniesSection />
      <CapabilitiesSection />
      <ConnectedSection />
      <OutcomesSection />
      <IntelligenceSection />
      <ScopeSection />
      <MiniCta />
      <FinalCta />
    </main>
  );
}
