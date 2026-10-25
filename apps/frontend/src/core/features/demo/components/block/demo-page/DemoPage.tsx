import { demoDashboardData } from '@/core/features/demo/assets/mock/dashboard';
import {
  demoAssistantSectionData,
  demoMiniCtaData,
  demoWorkflowSectionData,
} from '@/core/features/demo/assets/mock/sections';
import { DemoHero } from '@/core/features/demo/components/block/demo-hero/DemoHero';
import { DemoScenarioNav } from '@/core/features/demo/components/block/demo-scenarios/DemoScenarioNav';
import { MiniCta } from '@/core/features/landing/components/block/cta/CtaSections';
import { HeroDashboard } from '@/core/features/landing/components/block/hero/HeroDashboard';
import { IntelligenceSection } from '@/core/features/landing/components/block/intelligence/IntelligenceSection';
import { ConnectedSection } from '@/core/features/landing/components/block/workflow/ConnectedSection';
import { landingRootClass } from '@/core/features/landing/lib/landing-classes';

export function DemoPage() {
  return (
    <div className={landingRootClass}>
      <DemoHero />

      <HeroDashboard data={demoDashboardData} id="demo" variant="demo" />

      <DemoScenarioNav />

      <ConnectedSection data={demoWorkflowSectionData} variant="plain" />

      <IntelligenceSection data={demoAssistantSectionData} variant="demo" />

      <MiniCta data={demoMiniCtaData} />
    </div>
  );
}
