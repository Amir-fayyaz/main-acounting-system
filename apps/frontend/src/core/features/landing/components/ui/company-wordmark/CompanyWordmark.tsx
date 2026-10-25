import { Span } from '@/core/components/custom/ui/typography/Typography';
import type { CompanyBrand, CompanyBrandKey } from '@/core/features/landing/assets/@types/company';
import { cn } from '@/core/utils/shadcn/utils';
import type { ReactNode } from 'react';

const symbolByBrand: Partial<Record<CompanyBrandKey, ReactNode>> = {
  tapsi: (
    <svg viewBox="0 0 28 28" className="symbolClassName" aria-hidden="true">
      <path d="M3 9h22M3 18h22" strokeWidth={4} />
    </svg>
  ),
  aparat: (
    <svg viewBox="0 0 28 28" className="symbolClassName" aria-hidden="true">
      <circle cx="14" cy="14" r="10" />
      <circle cx="10" cy="10" r="1.8" />
      <circle cx="18" cy="10" r="1.8" />
      <circle cx="10" cy="18" r="1.8" />
      <circle cx="18" cy="18" r="1.8" />
    </svg>
  ),
  bazaar: (
    <svg viewBox="0 0 28 28" className="symbolClassName" aria-hidden="true">
      <path d="M5 10h18l-2 14H7L5 10Zm5 0V7a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  zarinpal: (
    <svg viewBox="0 0 28 28" className="symbolClassName" aria-hidden="true">
      <path d="m15 3-9 13h7l-1 9 10-14h-8l1-8Z" />
    </svg>
  ),
};

const nameClassNameByBrand: Record<CompanyBrandKey, string> = {
  digikala:
    "relative text-[24px] after:absolute after:right-[3px] after:-bottom-[9px] after:h-[3px] after:w-[33px] after:rounded-[3px] after:bg-current after:content-[''] max-[1050px]:text-[23px] max-[600px]:text-[22px] max-[600px]:after:-bottom-[7px] max-[600px]:after:h-[2px] max-[600px]:after:w-[28px] max-[800px]:text-[20px]",
  snapp:
    'font-[900] text-[29px] tracking-[-1px] max-[1050px]:text-[23px] max-[600px]:text-[27px] max-[800px]:text-[25px]',
  tapsi: 'text-[27px] max-[1050px]:text-[23px] max-[600px]:text-[22px] max-[800px]:text-[20px]',
  aparat:
    'font-[750] text-[25px] max-[1050px]:text-[23px] max-[600px]:text-[22px] max-[800px]:text-[20px]',
  bazaar:
    'font-[750] text-[27px] max-[1050px]:text-[23px] max-[600px]:text-[22px] max-[800px]:text-[20px]',
  zarinpal:
    'font-[750] text-[23px] max-[1050px]:text-[23px] max-[600px]:text-[22px] max-[800px]:text-[20px]',
};

export function CompanyWordmark({ brand }: { brand: CompanyBrand }) {
  const symbol = symbolByBrand[brand.key];

  return (
    <div
      lang={brand.lang}
      dir={brand.dir}
      className="flex min-h-[42px] items-center justify-center gap-1.5 leading-[1.2] text-[#776f63] transition-colors duration-200 select-none hover:text-foreground max-[600px]:min-h-[35px] max-[600px]:gap-[5px]"
    >
      {symbol ? (
        <Span className="grid h-[27px] w-[27px] place-items-center max-[1050px]:w-[23px] max-[600px]:h-[22px] max-[600px]:w-[22px] max-[800px]:w-[19px]">
          {symbol}
        </Span>
      ) : null}

      <strong className={cn('font-[850] tracking-[-1.2px]', nameClassNameByBrand[brand.key])}>
        {brand.name}
      </strong>
    </div>
  );
}
