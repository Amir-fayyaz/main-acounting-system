import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';
import HeroActions from './HeroActions';
import HeroBenefits from './HeroBenefits';
import { HeroDashboard } from './HeroDashboard';
import { H1, Muted, Span } from '@/core/components/custom/ui/typography/Typography';
import { Check } from 'lucide-react';

const orbitIconClass =
  'absolute z-[1] grid size-[49px] place-items-center rounded-[13px] border border-[#e7dfd1] bg-[#f7f6ee] text-[#7c6648] shadow-[0_5px_15px_#37240e04] max-[600px]:hidden max-[800px]:size-10 max-[800px]:rounded-[10px]';


export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden pt-[62px] max-[600px]:pt-[38px]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[83px] left-1/2 h-[750px] w-[1120px] -translate-x-1/2 rounded-full border border-[#e7dfce] opacity-[0.65] max-[600px]:top-[100px] max-[600px]:h-[550px] max-[600px]:w-[660px] max-[800px]:top-[60px] max-[800px]:w-[920px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[4px] left-1/2 h-[950px] w-[1380px] -translate-x-1/2 rounded-full border border-dashed border-[#e7dfce] opacity-[0.45] max-[600px]:top-[50px] max-[600px]:h-[700px] max-[600px]:w-[800px]"
      />

      <div
        aria-hidden="true"
        className={cn(
          orbitIconClass,
          'top-[170px] left-[10%] -rotate-[11deg] text-[#a86800] max-[1050px]:left-[4%] max-[800px]:top-[132px] max-[800px]:left-[1%]',
        )}
      >
        <LandingIcon name="receipt" className="size-6" />
      </div>

      <div
        aria-hidden="true"
        className={cn(
          orbitIconClass,
          'top-[215px] right-[10%] rotate-[10deg] max-[1050px]:right-[4%] max-[800px]:top-[164px] max-[800px]:right-[1%]',
        )}
      >
        <LandingIcon name="bank" className="size-6" />
      </div>

      <div
        aria-hidden="true"
        className={cn(
          orbitIconClass,
          'top-[360px] left-[16%] rotate-[8deg] max-[1050px]:left-[7%] max-[800px]:hidden',
        )}
      >
        <LandingIcon name="box" className="size-6" />
      </div>

      <div
        aria-hidden="true"
        className={cn(
          orbitIconClass,
          'top-[383px] right-[17%] -rotate-[8deg] text-[#a86800] max-[1050px]:right-[7%] max-[800px]:hidden',
        )}
      >
        <LandingIcon name="chart" className="size-6" />
      </div>

      <div className={cn('landingContainerClass relative z-[2] max-w-[810px] text-center')}>
        <div className="inline-flex items-center gap-[9px] rounded-[30px] border border-[#e5dccb] bg-[#f7f6ee] px-3 py-[5px] text-[12px] text-[#5d5040] max-[600px]:gap-[7px] max-[600px]:px-[9px] max-[600px]:py-1 max-[600px]:text-[10px]">
          <span className="inline-flex items-center gap-[5px] rounded-[20px] bg-[#fff1d9] px-2 py-px text-[#875100] max-[600px]:px-[5px] max-[600px]:text-[9px]">
            <LandingIcon name="spark" className="size-[13px] shrink-0" />
            هوشمند، با اختیار شما
          </span>
          <span>برای شرکت‌های ایرانی</span>
        </div>

        <H1
          id="hero-title"
          className="mx-auto max-w-4xl mt-10 font-black"
        >
          حسابداری یکپارچه.
          <span className="mt-1 block sm:mt-2">
            خیالِ{" "}
            <span
              className="
    relative z-0 inline-block whitespace-nowrap
    after:absolute after:-z-10 after:content-['']
    after:inset-x-[-3px] after:bottom-[0.02em]
    after:h-[0.22em]
    after:rotate-[-1.5deg]
    after:rounded-[60%_15%_45%_20%]
    after:bg-primary
    sm:after:inset-x-[-5px]
    sm:after:h-[0.24em]
  "
            >
              حسابدار
            </span>
            ، آسوده.
          </span>
        </H1>


        <Muted className="pt-6 sm:text-sm text-[11px]">
          از اولین فاکتور تا بستن حساب‌ها، همه‌چیز در یک جریان.
          <br />
          کارهای تکراری با تراز؛ بررسی و تصمیم نهایی با شما.
        </Muted>

        <HeroActions />

        <div className="mx-auto mt-5 flex w-fit items-center justify-center gap-2 sm:gap-5">
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Check aria-hidden="true" className="shrink-0 text-[#28765b]" size={14} />
            <Span className="text-[10px] text-muted-foreground sm:text-xs">
              بدون نیاز به ثبت‌نام
            </Span>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Check aria-hidden="true" className="shrink-0 text-[#28765b]" size={14} />
            <Span className="text-[10px] text-muted-foreground sm:text-xs">
              داده‌های نمونه، تجربه واقعی
            </Span>
          </div>
        </div>
      </div>

      <HeroDashboard />

      <div className="relative z-[2] border-t border-[#e4dfd3] bg-[#f7f6ee] pt-[22px] max-[600px]:pt-[18px]">
        <HeroBenefits />
      </div>
    </section>
  );
}
