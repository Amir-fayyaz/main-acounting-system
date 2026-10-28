import Link from 'next/link';

import { Button, H2, P, Small, Span } from '@repo/web/ui';

import type { MiniCtaData } from '@/core/features/landing/assets/@types/sections';
import { landingMiniCtaData } from '@/core/features/landing/assets/mock/sections';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@repo/web/ui/utils/cn';

interface MiniCtaProps {
  data?: MiniCtaData;
  className?: string;
}

export function MiniCta({ data = landingMiniCtaData, className }: MiniCtaProps) {
  return (
    <section className="py-8 sm:py-12">
      <div
        aria-labelledby="mini-cta-title"
        className={cn(
          'flex items-center justify-between gap-9 rounded-xl border border-[#e1d7c3] bg-[#efe9d9] py-7 px-8 max-sm:block max-sm:rounded-lg max-sm:p-6 max-lg:p-6',
          className,
        )}
      >
        <div>
          <H2
            id="mini-cta-title"
            className="mt-0 mr-0 mb-1 ml-0 text-2xl leading-relaxed tracking-tight max-sm:text-xl max-lg:text-xl"
          >
            {data.title}
          </H2>

          <P className="text-xs text-[#78674c]">{data.description}</P>
        </div>

        <Button
          asChild
          variant="default"
          className="bg-foreground text-white max-sm:min-h-11 max-sm:text-xs max-md:text-xs sm:mt-0 mt-5"
        >
          <Link href={data.href}>
            <Span className="text-[length:inherit]">{data.actionLabel}</Span>
            <LandingIcon name="arrow" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="py-8 sm:py-12">
      <div
        aria-labelledby="cta-title"
        className="relative flex items-center justify-between gap-10 overflow-hidden rounded-xl bg-primary py-12 px-14 after:absolute after:inset-auto after:-bottom-44 after:-left-16 after:size-112 after:rounded-full after:border after:border-[#b8710033] after:content-[''] max-xl:p-9 max-sm:block max-sm:rounded-lg max-sm:px-6 max-md:p-8 [&>div]:relative [&>div]:z-1"
      >
        <div>
          <Span className={cn('landingEyebrowClass text-[#5f3909] before:bg-foreground')}>
            وقت حساب‌های روشن‌تر است.
          </Span>

          <H2
            id="cta-title"
            className="my-2.5 mb-2 text-4xl leading-relaxed tracking-tighter max-xl:text-3xl max-sm:max-w-64 max-sm:text-3xl max-md:text-3xl"
          >
            دوباره‌کاری کمتر.
            <br />
            تسلط بیشتر.
          </H2>

          <P className="text-xs text-[#5f3909]">
            یک جریان مالی یکپارچه، از اولین فاکتور تا آخرین تراز.
          </P>
        </div>

        <div className="text-center max-sm:mt-5 max-sm:text-right">
          <Button
            asChild
            className="bg-foreground text-white max-sm:min-h-11 max-sm:text-xs max-md:text-xs"
          >
            <Link href="/demo">
              <Span className="text-[length:inherit]">تراز را از نزدیک ببینید</Span>
              <LandingIcon name="arrow" />
            </Link>
          </Button>

          <Small className="mt-2.5 block text-xs text-[#5f3909] max-sm:pr-0.5">
            محیط نمونه · بدون نیاز به ثبت‌نام
          </Small>
        </div>
      </div>
    </section>
  );
}
