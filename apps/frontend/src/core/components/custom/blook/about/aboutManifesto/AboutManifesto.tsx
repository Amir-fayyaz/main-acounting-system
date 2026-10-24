import AboutManifestoLabel from './aboutManifestoLabel/AboutManifestoLabel';
import AboutManifestoText from './aboutManifestoText/AboutManifestoText';

function AboutManifesto() {
  return (
    <section className="my-[7px] mb-[15px] border-y border-border py-[26px] max-[600px]:block max-[900px]:grid max-[900px]:grid-cols-[150px_1fr] max-[900px]:gap-[25px] sm:my-5 sm:mb-10 sm:grid sm:grid-cols-[200px_1fr] sm:gap-10 sm:py-9">
      <AboutManifestoLabel />

      <AboutManifestoText />
    </section>
  );
}

export default AboutManifesto;
