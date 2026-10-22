import Eyebrow from '@/core/components/custom/ui/eyebrow/Eyebrow';

export interface ContactHeroTitleProps {
  eyebrow?: string;
  titleLead?: string;
  titleAccent?: string;
}

function ContactHeroTitle({
  eyebrow = 'تماس با ما',
  titleLead = 'از نیاز مالی شرکت‌تان،',
  titleAccent = 'برایمان بگویید.',
}: ContactHeroTitleProps) {
  return (
    <>
      <Eyebrow className="justify-center">{eyebrow}</Eyebrow>

      <h1 className="my-[17px] text-[32px] leading-[1.65] tracking-[-1px] max-taraz-xl:text-[41px] max-taraz-3xl:text-[44px] sm:my-[17px] sm:text-[48px] sm:leading-[1.65] sm:tracking-[-1.8px]">
        {titleLead}
        <br />
        <span className="text-accent-text">{titleAccent}</span>
      </h1>
    </>
  );
}

export default ContactHeroTitle;
