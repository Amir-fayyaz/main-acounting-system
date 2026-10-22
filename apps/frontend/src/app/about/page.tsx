import AboutIntro from '@/core/components/custom/blook/about/aboutIntro/AboutIntro';
import AboutManifesto from '@/core/components/custom/blook/about/aboutManifesto/AboutManifesto';
import AboutPrinciples from '@/core/components/custom/blook/about/aboutPrinciples/AboutPrinciples';
import MiniCTA from '@/core/components/custom/blook/about/miniCTA/MiniCTA';

export default function AboutPage() {
  return (
    <main className="font-[family-name:var(--font-vazirmatn)]">
      <div className="pages-container">
        <AboutIntro />
        <AboutManifesto />
        <AboutPrinciples />
        <MiniCTA />
      </div>
    </main>
  );
}
