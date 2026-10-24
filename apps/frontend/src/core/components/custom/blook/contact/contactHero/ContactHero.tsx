import ContactHeroDescription from './contactHeroDescription/ContactHeroDescription';
import ContactHeroTitle from './contactHeroTitle/ContactHeroTitle';

export interface ContactHeroProps {
  eyebrow?: string;
  titleLead?: string;
  titleAccent?: string;
  description?: string;
}

function ContactHero({
  eyebrow,
  titleLead,
  titleAccent,
  description,
}: ContactHeroProps) {
  return (
    <section className="mx-auto max-w-[800px] pt-[43px] pb-[30px] text-center max-[900px]:pt-[53px] sm:pt-[66px] sm:pb-[38px]">
      <ContactHeroTitle
        eyebrow={eyebrow}
        titleAccent={titleAccent}
        titleLead={titleLead}
      />
      <ContactHeroDescription text={description} />
    </section>
  );
}

export default ContactHero;
