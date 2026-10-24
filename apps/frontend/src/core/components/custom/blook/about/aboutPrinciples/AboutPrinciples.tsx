import AboutPrinciplesGrid from './aboutPrinciplesGrid/AboutPrinciplesGrid';
import AboutPrinciplesRibbon from './aboutPrinciplesRibbon/AboutPrinciplesRibbon';
import AboutPrinciplesTitle from './aboutPrinciplesTitle/AboutPrinciplesTitle';

function AboutPrinciples() {
  return (
    <section className="py-[35px] pb-[45px] sm:py-[45px] sm:pb-[65px]">
      <AboutPrinciplesTitle />

      <AboutPrinciplesGrid />

      <AboutPrinciplesRibbon />
    </section>
  );
}

export default AboutPrinciples;
