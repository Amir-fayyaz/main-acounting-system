import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';
import { Button } from '@/shadcn/button/button';
import Link from 'next/link';

export interface MiniCTAProps {
  title?: string;
  description?: string;
  buttonLabel?: string;
  buttonHref?: string;
}

function MiniCTA({
  title = 'مسیر کار خودتان را پیدا کنید.',
  description = 'از فروش و انبار تا تطبیق بانکی؛ همه با داده‌های نمونه قابل بررسی‌اند.',
  buttonLabel = 'دیدن محیط نمونه',
  buttonHref = '/demo',
}: MiniCTAProps) {
  return (
    <section className="my-7 mb-[43px] block rounded-[10px] border border-mini-cta-border bg-mini-cta p-6 sm:my-[35px] sm:mb-[65px] sm:flex sm:items-center sm:justify-between sm:gap-[35px] sm:rounded-[13px] sm:p-[29px_34px]">
      <div>
        <h2 className="mb-[5px] text-[22px] leading-[1.8] tracking-[-0.5px] sm:text-[23px] max-taraz-xl:text-[21px]">
          {title}
        </h2>
        <p className="text-[11px] text-muted-foreground sm:text-xs">{description}</p>
      </div>

      <Button
        asChild
        className="mt-[19px] min-h-[42px] shrink-0 gap-2.5 rounded-lg bg-ink px-[17px] text-[11px] font-semibold text-white hover:bg-ink-soft sm:mt-0 sm:min-h-11 sm:px-6 sm:text-xs"
      >
        <Link href={buttonHref}>
          {buttonLabel}
          <TarazIcon className="size-4 sm:size-[18px]" name="arrow" />
        </Link>
      </Button>
    </section>
  );
}

export default MiniCTA;
