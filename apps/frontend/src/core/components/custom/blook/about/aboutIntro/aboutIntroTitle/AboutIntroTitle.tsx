import Eyebrow from '@/core/components/custom/ui/eyebrow/Eyebrow';

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
      <Eyebrow>{eyebrow}</Eyebrow>

      <h1 className="my-[18px] text-[33px] leading-[1.75] tracking-[-1px] max-taraz-sm:my-4 max-taraz-xl:text-[34px] max-taraz-3xl:text-[39px] sm:text-[46px] sm:leading-[1.7] sm:tracking-[-1.7px]">
        {titleLead}
        <br />
        <span className="text-accent-text">{titleAccent}</span>
      </h1>
    </>
  );
}

export default AboutIntroTitle;
