
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
      <span className="flex items-center justify-center gap-[9px] text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">{eyebrow}</span>

      <h1 className="my-[17px] text-[32px] leading-[1.65] tracking-[-1px] max-[900px]:text-[41px] max-[1100px]:text-[44px] sm:my-[17px] sm:text-[48px] sm:leading-[1.65] sm:tracking-[-1.8px]">
        {titleLead}
        <br />
        <span className="text-brand-link">{titleAccent}</span>
      </h1>
    </>
  );
}

export default ContactHeroTitle;
