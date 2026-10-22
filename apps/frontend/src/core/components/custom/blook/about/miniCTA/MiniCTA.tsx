import MiniCtaButton from './miniCtaButton/MiniCtaButton';
import MiniCtaDescription from './miniCtaDescription/MiniCtaDescription';
import MiniCtaTitle from './miniCtaTitle/MiniCtaTitle';

export interface MiniCTAProps {
  title?: string;
  description?: string;
  buttonLabel?: string;
  buttonHref?: string;
}

function MiniCTA({
  title,
  description,
  buttonLabel,
  buttonHref,
}: MiniCTAProps) {
  return (
    <section className="my-7 mb-[43px] block rounded-[10px] border border-mini-cta-border bg-mini-cta p-6 sm:my-[35px] sm:mb-[65px] sm:flex sm:items-center sm:justify-between sm:gap-[35px] sm:rounded-[13px] sm:p-[29px_34px]">
      <div>
        <MiniCtaTitle>{title}</MiniCtaTitle>
        <MiniCtaDescription>{description}</MiniCtaDescription>
      </div>

      <MiniCtaButton href={buttonHref} label={buttonLabel} />
    </section>
  );
}

export default MiniCTA;
