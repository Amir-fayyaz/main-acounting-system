
export interface AboutIntroTitleProps {
  eyebrow?: string;
  titleLead?: string;
  titleAccent?: string;
}

function AboutIntroTitle({
  eyebrow = 'درباره تراز',
  titleLead = 'از سمت حسابدار،',
  titleAccent = 'به کار نگاه می‌کنیم.',
}: AboutIntroTitleProps) {
  return (
    <>
      <span className="flex items-center gap-[9px] text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">{eyebrow}</span>

      <h1 className="my-[18px] text-[33px] leading-[1.75] tracking-[-1px] max-[600px]:my-4 max-[900px]:text-[34px] max-[1100px]:text-[39px] sm:text-[46px] sm:leading-[1.7] sm:tracking-[-1.7px]">
        {titleLead}
        <br />
        <span className="text-brand-link">{titleAccent}</span>
      </h1>
    </>
  );
}

export default AboutIntroTitle;
