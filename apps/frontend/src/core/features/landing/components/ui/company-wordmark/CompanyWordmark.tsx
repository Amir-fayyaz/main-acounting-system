import { Span } from '@repo/web/ui';
import type { CompanyBrand, CompanyBrandKey } from '@/core/features/landing/assets/@types/company';
import { cn } from '@repo/web/ui/utils/cn';
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
    "relative text-2xl after:absolute after:right-0.5 after:-bottom-2 after:h-0.5 after:w-8 after:rounded-sm after:bg-current after:content-[''] max-sm:text-xl max-sm:after:-bottom-1.5 max-sm:after:h-0.5 max-sm:after:w-7 max-md:text-xl",
  snapp: 'font-black text-3xl tracking-tighter max-xl:text-2xl max-sm:text-2xl max-md:text-2xl',
  tapsi: 'text-2xl max-sm:text-xl max-md:text-xl',
  aparat: 'font-bold text-2xl max-sm:text-xl max-md:text-xl',
  bazaar: 'font-bold text-2xl max-sm:text-xl max-md:text-xl',
  zarinpal: 'font-bold text-2xl max-sm:text-xl max-md:text-xl',
};

export function CompanyWordmark({ brand }: { brand: CompanyBrand }) {
  const symbol = symbolByBrand[brand.key];

  return (
    <div
      lang={brand.lang}
      dir={brand.dir}
      className="flex min-h-10 items-center justify-center gap-1.5 leading-tight text-muted-foreground transition-colors duration-200 select-none hover:text-foreground max-sm:min-h-9 max-sm:gap-1"
    >
      {symbol ? (
        <Span className="text-[length:inherit] grid h-7 w-7 place-items-center max-xl:w-6 max-sm:h-5 max-sm:w-5 max-md:w-5">
          {symbol}
        </Span>
      ) : null}

      <strong className={cn('font-extrabold tracking-tighter', nameClassNameByBrand[brand.key])}>
        <Span className="text-[length:inherit]">{brand.name}</Span>
      </strong>
    </div>
  );
}
