import { AboutIntro } from '@/core/features/landing/components/block/about/intro/AboutIntro';
import { AboutManifesto } from '@/core/features/landing/components/block/about/manifesto/AboutManifesto';
import { AboutMiniCta } from '@/core/features/landing/components/block/about/cta/AboutMiniCta';
import { AboutPrinciples } from '@/core/features/landing/components/block/about/principles/AboutPrinciples';

export function AboutPage() {
  return (
    <main className="font-[family-name:var(--font-vazirmatn)]">
      <div className="pages-container">
        <AboutIntro />
        <AboutManifesto />
        <AboutPrinciples />
        <AboutMiniCta />
      </div>
    </main>
  );
}
