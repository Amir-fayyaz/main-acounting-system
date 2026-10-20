import AboutIntro from '@/core/components/custom/blook/about/aboutIntro/AboutIntro';
import AboutManifesto from '@/core/components/custom/blook/about/aboutManifesto/AboutManifesto';
import AboutPrinciples from '@/core/components/custom/blook/about/aboutPrinciples/AboutPrinciples';
import MiniCTA from '@/core/components/custom/blook/about/miniCTA/MiniCTA';
import IconDefs from '@/core/components/custom/ui/icons/IconDefs';

export default function AboutPage() {
  return (
    <main className="font-taraz">
      <IconDefs />
      <div className="tz-container">
        <AboutIntro />
        <AboutManifesto />
        <AboutPrinciples />
        <MiniCTA />
      </div>
    </main>
  );
}
