import AboutIntroCta from './aboutIntroCta/AboutIntroCta';
import AboutIntroDescription from './aboutIntroDescription/AboutIntroDescription';
import AboutIntroTitle from './aboutIntroTitle/AboutIntroTitle';
import AboutIntroVisual from './aboutIntroVisual/AboutIntroVisual';

function AboutIntro() {
  return (
    <section className="grid items-center gap-[29px] pt-10 pb-[29px] max-[600px]:grid-cols-1 max-[900px]:gap-[30px] max-[900px]:pt-[50px] max-[1100px]:gap-[45px] max-[1100px]:pt-[68px] max-[1100px]:pb-[45px] sm:grid-cols-[1.1fr_1fr]">
      <div>
        <AboutIntroTitle />

        <AboutIntroDescription />

        <AboutIntroCta />
      </div>

      <AboutIntroVisual />
    </section>
  );
}

export default AboutIntro;
