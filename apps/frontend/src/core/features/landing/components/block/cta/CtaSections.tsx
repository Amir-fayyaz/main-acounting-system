import Link from 'next/link';

import { Button } from '@/core/components/shadcn/ui/button/button';
import type { MiniCtaData } from '@/core/features/landing/assets/@types/sections';
import { landingMiniCtaData } from '@/core/features/landing/assets/mock/sections';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import {
  landingContainerClass,
  landingEyebrowClass,
} from '@/core/features/landing/lib/landing-classes';
import { H2, P, Small, Span } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

interface MiniCtaProps {
  data?: MiniCtaData;
  className?: string;
}

export function MiniCta({ data = landingMiniCtaData, className }: MiniCtaProps) {
  return (
    <div className={landingContainerClass}>
      <section
        aria-labelledby="mini-cta-title"
        className={cn(
          'mt-[35px] mb-[65px] flex items-center justify-between gap-[35px] rounded-[13px] border border-[#e1d7c3] bg-[#efe9d9] p-[29px_34px] max-[600px]:mt-[28px] max-[600px]:mb-[43px] max-[600px]:block max-[600px]:rounded-[10px] max-[600px]:p-6 max-[900px]:p-[26px]',
          className,
        )}
      >
        <div>
          <H2
            id="mini-cta-title"
            className="mt-0 mr-0 mb-[5px] ml-0 text-[23px] leading-[1.8] tracking-[-0.5px] max-[600px]:text-[22px] max-[900px]:text-[21px]"
          >
            {data.title}
          </H2>

          <P className="text-[12px] text-[#78674c] max-[600px]:text-[11px]">{data.description}</P>
        </div>

        <Button
          asChild
          variant="default"
          className="bg-[#1a120a] text-white max-[600px]:min-h-[46px] max-[600px]:text-[12px] max-[800px]:text-[12px] sm:mt-0 mt-5"
        >
          <Link href={data.href}>
            {data.actionLabel}
            <LandingIcon name="arrow" />
          </Link>
        </Button>
      </section>
    </div>
  );
}

export function FinalCta() {
  return (
    <div className={landingContainerClass}>
      <section
        aria-labelledby="cta-title"
        className="relative flex items-center justify-between gap-10 overflow-hidden rounded-[14px] bg-[#ffa00a] p-[48px_54px] after:absolute after:inset-auto after:-bottom-[170px] after:-left-[70px] after:size-[420px] after:rounded-full after:border after:border-[#b8710033] after:content-[''] max-[1050px]:p-[38px] max-[600px]:block max-[600px]:rounded-[10px] max-[600px]:p-[29px_25px] max-[800px]:p-[33px] [&>div]:relative [&>div]:z-[1]"
      >
        <div>
          <Span className={cn(landingEyebrowClass, 'text-[#5f3909] before:bg-[#1a120a]')}>
            وقت حساب‌های روشن‌تر است.
          </Span>

          <H2
            id="cta-title"
            className="my-[10px_8px] text-[38px] leading-[1.65] tracking-[-1.2px] max-[1050px]:text-[29px] max-[600px]:max-w-[260px] max-[600px]:text-[31px] max-[600px]:leading-[1.8] max-[800px]:text-[29px]"
          >
            دوباره‌کاری کمتر.
            <br />
            تسلط بیشتر.
          </H2>

          <P className="text-[12px] text-[#5f3909] max-[600px]:text-[11px]">
            یک جریان مالی یکپارچه، از اولین فاکتور تا آخرین تراز.
          </P>
        </div>

        <div className="text-center max-[600px]:mt-[22px] max-[600px]:text-right">
          <Button
            asChild
            className="bg-[#1a120a] text-white max-[600px]:min-h-[46px] max-[600px]:text-[12px] max-[800px]:text-[12px]"
          >
            <Link href="/demo">
              تراز را از نزدیک ببینید
              <LandingIcon name="arrow" />
            </Link>
          </Button>

          <Small className="mt-2.5 block text-[10px] text-[#5f3909] max-[600px]:pr-[3px] max-[600px]:text-[9px]">
            محیط نمونه · بدون نیاز به ثبت‌نام
          </Small>
        </div>
      </section>
    </div>
  );
}
