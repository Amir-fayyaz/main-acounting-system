import Link from 'next/link';

import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@repo/web/ui/utils/cn';

type SiteBrandSize = 'header' | 'footer';

interface BrandClasses {
  link: string;
  mark: string;
  icon: string;
}

const brandClasses: Record<SiteBrandSize, BrandClasses> = {
  header: {
    link: 'gap-2 text-[27px] leading-none font-[850] max-[600px]:gap-[7px] max-[600px]:text-[24px] max-[900px]:text-[25px]',
    mark: 'h-[33px] w-[33px] rounded-[9px] max-[600px]:h-[29px] max-[600px]:w-[29px] max-[600px]:rounded-[8px] max-[900px]:h-[31px] max-[900px]:w-[31px]',
    icon: 'h-[25px] w-[25px] stroke-[2.4] max-[600px]:h-[22px] max-[600px]:w-[22px]',
  },
  footer: {
    link: 'gap-3 text-[33px] leading-none font-[850] text-[#fff5e2] max-[680px]:gap-[9px] max-[680px]:text-[31px] max-[850px]:text-[27px]',
    mark: 'size-[39px] rounded-[9px] max-[680px]:size-[35px] max-[850px]:size-[32px] max-[850px]:rounded-lg',
    icon: 'size-[27px] max-[680px]:size-6',
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
      <span
        aria-hidden="true"
        className={cn('grid shrink-0 place-items-center bg-[#ffa00a] text-[#1a120a]', classes.mark)}
      >
        <LandingIcon name="logo" className={classes.icon} />
      </span>

      {size === 'header' ? (
        <span className="flex flex-col gap-[5px]">
          <span className="leading-none">تراز</span>
          <small className="text-[8px] leading-none font-normal tracking-normal text-[#7e6c50] whitespace-nowrap max-[1100px]:text-[7px] max-[900px]:hidden">
            حسابداری یکپارچه
          </small>
        </span>
      ) : (
        <span>تراز</span>
      )}
    </Link>
  );
}
