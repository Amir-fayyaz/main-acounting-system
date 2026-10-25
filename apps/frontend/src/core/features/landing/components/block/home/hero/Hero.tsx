import SectionLayout from '@/core/components/custom/ui/wrapper/SectionLayout';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';
import HeroActions from '@/core/features/landing/components/ui/hero/HeroActions';
import HeroBenefits from '@/core/features/landing/components/ui/hero/HeroBenefits';
import { HeroDashboard } from '@/core/features/landing/components/block/shared/dashboard/HeroDashboard';
import { H1, Muted, Span } from '@/core/components/custom/ui/typography/Typography';
import { Check } from 'lucide-react';

export function Hero() {
  return (
    <SectionLayout className="relative overflow-hidden pt-10 pb-0 sm:pt-16">
      <div aria-labelledby="hero-title">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-20 left-1/2 h-180 w-280 -translate-x-1/2 rounded-full border border-[#e7dfce] opacity-65 max-sm:top-24 max-sm:h-144 max-sm:w-160 max-md:top-14 max-md:w-240"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1 left-1/2 h-240 w-360 -translate-x-1/2 rounded-full border border-dashed border-[#e7dfce] opacity-45 max-sm:top-12 max-sm:h-180 max-sm:w-200"
        />

        <div
          aria-hidden="true"
          className={cn(
            'orbitIconClass',
            'top-44 left-[10%] -rotate-[11deg] text-[#a86800] max-xl:left-[4%] max-md:top-32 max-md:left-[1%]',
          )}
        >
          <LandingIcon name="receipt" className="size-6" />
        </div>

        <div
          aria-hidden="true"
          className={cn(
            'orbitIconClass',
            'top-52 right-[10%] rotate-[10deg] max-xl:right-[4%] max-md:top-40 max-md:right-[1%]',
          )}
        >
          <LandingIcon name="bank" className="size-6" />
        </div>

        <div
          aria-hidden="true"
          className={cn(
            'orbitIconClass',
            'top-96 left-[16%] rotate-[8deg] max-xl:left-[7%] max-md:hidden',
          )}
        >
          <LandingIcon name="box" className="size-6" />
        </div>

        <div
          aria-hidden="true"
          className={cn(
            'orbitIconClass',
            'top-96 right-[17%] -rotate-[8deg] text-[#a86800] max-xl:right-[7%] max-md:hidden',
          )}
        >
          <LandingIcon name="chart" className="size-6" />
        </div>

        <div className={cn('relative z-2 mx-auto max-w-4xl text-center')}>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dccb] bg-[#f7f6ee] px-3 py-1 text-xs text-[#5d5040] max-sm:gap-1.5 max-sm:px-2">
            <Span className="inline-flex items-center gap-1 rounded-2xl bg-[#fff1d9] px-2 py-px text-[#875100] max-sm:px-1 max-sm:text-xs">
              <LandingIcon name="spark" className="size-3 shrink-0" />
              هوشمند، با اختیار شما
            </Span>
            <Span className="text-[length:inherit]">برای شرکت‌های ایرانی</Span>
          </div>

          <H1 id="hero-title" className="mx-auto max-w-4xl mt-10 font-black text-3xl sm:text-5xl">
            حسابداری یکپارچه.
            <Span className="text-[length:inherit] mt-1 block sm:mt-2">
              خیالِ{' '}
              <Span className="text-[length:inherit] relative z-0 inline-block whitespace-nowrap after:absolute after:-z-10 after:content-[''] after:-inset-x-0.5 after:bottom-[0.02em] after:h-[0.22em] after:rotate-[-1.5deg] after:rounded-[60%_15%_45%_20%] after:bg-primary sm:after:-inset-x-1 sm:after:h-[0.24em]">
                حسابدار
              </Span>
              ، آسوده.
            </Span>
          </H1>

          <Muted className="pt-6 sm:text-sm text-xs">
            از اولین فاکتور تا بستن حساب‌ها، همه‌چیز در یک جریان.
            <br />
            کارهای تکراری با تراز؛ بررسی و تصمیم نهایی با شما.
          </Muted>

          <HeroActions />

          <div className="mx-auto mt-5 flex w-fit items-center justify-center gap-2 sm:gap-5">
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Check aria-hidden="true" className="shrink-0 text-[#28765b]" size={14} />
              <Span className="text-xs text-muted-foreground">بدون نیاز به ثبت‌نام</Span>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <Check aria-hidden="true" className="shrink-0 text-[#28765b]" size={14} />
              <Span className="text-xs text-muted-foreground">داده‌های نمونه، تجربه واقعی</Span>
            </div>
          </div>
        </div>

        <HeroDashboard />

        <div className="relative z-2 border-t border-[#e4dfd3] bg-[#f7f6ee] pt-5 max-sm:pt-4">
          <HeroBenefits />
        </div>
      </div>
    </SectionLayout>
  );
}
