import FaqHeroDescription from './faqHeroDescription/FaqHeroDescription';
import FaqHeroTitle from './faqHeroTitle/FaqHeroTitle';

export interface FaqHeroProps {
  eyebrow?: string;
  titleLead?: string;
  titleAccent?: string;
  description?: string;
}

function FaqHero({
  eyebrow,
  titleLead,
  titleAccent,
  description,
}: FaqHeroProps) {
  return (
    <section className="mx-auto max-w-[800px] pt-[43px] pb-[30px] text-center max-[900px]:pt-[53px] sm:pt-[66px] sm:pb-[38px]">
      <FaqHeroTitle
        eyebrow={eyebrow}
        titleAccent={titleAccent}
        titleLead={titleLead}
      />
      <FaqHeroDescription text={description} />
    </section>
  );
}

export default FaqHero;
