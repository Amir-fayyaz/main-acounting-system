import { demoDashboardData } from '@/core/features/landing/assets/mock/demo/dashboard';
import {
  demoAssistantSectionData,
  demoMiniCtaData,
  demoWorkflowSectionData,
} from '@/core/features/landing/assets/mock/demo/sections';
import { DemoHero } from '@/core/features/landing/components/block/demo/hero/DemoHero';
import { DemoScenarioNav } from '@/core/features/landing/components/block/demo/scenarios/DemoScenarioNav';
import { MiniCta } from '@/core/features/landing/components/block/shared/cta/CtaSections';
import { HeroDashboard } from '@/core/features/landing/components/block/shared/dashboard/HeroDashboard';
import { IntelligenceSection } from '@/core/features/landing/components/block/shared/intelligence/IntelligenceSection';
import { ConnectedSection } from '@/core/features/landing/components/block/shared/workflow/ConnectedSection';

export function DemoPage() {
  return (
    <div className="landingRootClass">
      <DemoHero />

      <HeroDashboard data={demoDashboardData} id="demo" variant="demo" />

      <DemoScenarioNav />

      <ConnectedSection data={demoWorkflowSectionData} variant="plain" />

      <IntelligenceSection data={demoAssistantSectionData} variant="demo" />

      <MiniCta data={demoMiniCtaData} />
    </div>
  );
}
