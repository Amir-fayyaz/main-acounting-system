import { Small, Span } from '@/core/components/custom/ui/typography/Typography';
import Link from 'next/link';

import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';

type SiteBrandSize = 'header' | 'footer';

interface BrandClasses {
  link: string;
  mark: string;
  icon: string;
}

const brandClasses: Record<SiteBrandSize, BrandClasses> = {
  header: {
    link: 'gap-2 text-2xl leading-none font-extrabold max-sm:gap-1.5',
    mark: 'h-8 w-8 rounded-lg max-sm:h-7 max-sm:w-7 max-sm:rounded-lg max-lg:h-8 max-lg:w-8',
    icon: 'h-6 w-6 stroke-[2.4] max-sm:h-5 max-sm:w-5',
  },
  footer: {
    link: 'gap-3 text-3xl leading-none font-extrabold text-[#fff5e2] max-md:gap-2 max-lg:text-2xl',
    mark: 'size-10 rounded-lg max-md:size-9 max-lg:size-8 max-lg:rounded-lg',
    icon: 'size-7 max-md:size-6',
  },
};

export function SiteBrand({ size = 'header' }: { size?: SiteBrandSize }) {
  const classes = brandClasses[size];

  return (
    <Link
      href="/"
      aria-label="تراز، صفحه اصلی"
      className={cn('inline-flex w-max items-center', classes.link)}
    >
      <Span
        aria-hidden="true"
        className={cn(
          'text-[length:inherit]',
          cn('grid shrink-0 place-items-center bg-[#ffa00a] text-[#1a120a]', classes.mark),
        )}
      >
        <LandingIcon name="logo" className={classes.icon} />
      </Span>

      {size === 'header' ? (
        <Span className="text-[length:inherit] flex flex-col gap-1">
          <Span className="text-[length:inherit] leading-none">تراز</Span>
          <Small className="text-xs leading-none font-normal tracking-normal text-[#7e6c50] whitespace-nowrap max-lg:hidden">
            حسابداری یکپارچه
          </Small>
        </Span>
      ) : (
        <Span className="text-[length:inherit]">تراز</Span>
      )}
    </Link>
  );
}
