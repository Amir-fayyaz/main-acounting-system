import type { LandingIconName } from '@/core/features/landing/components/ui/icon/LandingIcon';

export interface DemoHeroData {
  eyebrow: string;
  title: {
    first: string;
    accent: string;
  };
  description: string;
  notice: string;
}

export interface DemoScenarioLink {
  href: string;
  label: string;
  icon: LandingIconName;
}
