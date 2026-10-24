import { H2, H3, P, Small, Span } from '@/core/components/custom/ui/typography/Typography';
import { scopeModules } from '@/core/features/landing/assets/mock/workspace';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import {
  landingContainerClass,
  landingEyebrowClass,
} from '@/core/features/landing/lib/landing-classes';
import { cn } from '@/core/utils/shadcn/utils';
import Link from 'next/link';

export function ScopeSection() {
  return (
    <section
      id="scope"
      aria-labelledby="scope-title"
      className={cn(
        landingContainerClass,
        'pt-5 pb-[75px] max-[600px]:pt-0 max-[600px]:pb-[53px] max-[800px]:pt-0 max-[800px]:pb-[65px]',
      )}
    >
      <div className="mb-[27px] flex items-center justify-between gap-[25px] max-[600px]:mb-[23px] max-[600px]:block">
        <div>
          <Span className={landingEyebrowClass}>برای جریان کامل کار / ۰۴</Span>

          <H2
            id="scope-title"
            className="mt-2.5 text-[25px] tracking-[-0.7px] max-[600px]:text-[25px] max-[600px]:leading-[1.8] max-[800px]:text-[23px]"
          >
            همه بخش‌ها، روی یک دفتر مشترک.
          </H2>
        </div>

        <P className="max-w-[300px] text-[12px] text-[#746b60] max-[600px]:mt-3 max-[600px]:max-w-[300px] max-[600px]:text-[11px] max-[800px]:max-w-[230px] max-[800px]:text-[11px]">
          از کار روزانه تا پایان دوره؛ بخش‌هایی که یک شرکت واقعی برای مدیریت مالی نیاز دارد.
        </P>
      </div>

      <div className="grid grid-cols-[240px_1fr] border-y border-[#ddd4c1] max-[1050px]:grid-cols-[205px_1fr] max-[600px]:grid-cols-1 max-[800px]:grid-cols-[175px_1fr]">
        <div className="relative flex flex-col justify-center overflow-hidden border-l border-[#ddd4c1] bg-[#f0eadc] p-[29px_25px] after:absolute after:-bottom-20 after:-left-[35px] after:size-[200px] after:rounded-full after:border after:border-[#d2c2a1] after:content-[''] max-[1050px]:p-[23px] max-[600px]:grid max-[600px]:grid-cols-[auto_1fr] max-[600px]:items-center max-[600px]:gap-x-[17px] max-[600px]:border-b max-[600px]:border-l-0 max-[600px]:p-[23px] max-[600px]:after:-bottom-20 max-[600px]:after:-left-[30px] max-[600px]:after:size-40 max-[800px]:p-5">
          <LandingIcon name="link" className="mb-[13px] size-7 text-[#8a5a19] max-[600px]:hidden" />

          <Span className="max-[1050px]:text-[54px] max-[600px]:col-start-1 max-[600px]:row-[1/3] max-[800px]:text-[54px] text-[62px] leading-[1.4] font-[800] tracking-[-3px]">
            ۸
          </Span>

          <H3 className="my-[5px_8px] text-[20px] leading-[1.8] tracking-[-0.5px] max-[600px]:col-start-2 max-[600px]:m-0 max-[600px]:mb-1 max-[600px]:text-[19px] max-[800px]:text-[17px]">
            جریان مالی.
            <br />
            یک تصویر مشترک.
          </H3>

          <P className="relative z-[1] text-[11px] leading-[2] text-[#6e604e] max-[600px]:col-start-2 max-[600px]:max-w-[220px] max-[800px]:text-[10px]">
            از خرید و فروش تا حقوق، مالیات و بستن دوره؛ متصل به یک دفتر کل.
          </P>

          <Link
            href="#workflow"
            className="relative z-[1] mt-5 inline-flex items-center gap-2 text-[11px] font-[650] text-[#704706] max-[600px]:col-start-2 max-[600px]:mt-2.5 max-[600px]:text-[10px] max-[800px]:text-[10px] [&_svg]:size-4"
          >
            دیدن جریان کار
            <LandingIcon name="arrow" />
          </Link>
        </div>

        <div className="grid grid-cols-2 overflow-hidden">
          {scopeModules.map((module, index) => (
            <div
              key={module.title}
              className={cn(
                'flex items-start gap-[13px] border-b border-l border-[#e0d8c7] p-[22px_24px] max-[1050px]:gap-[9px] max-[1050px]:p-[20px_17px] max-[600px]:gap-2 max-[600px]:p-[18px_12px] max-[600px]:[&:nth-child(n+7)]:border-b-0 max-[800px]:gap-[7px] max-[800px]:p-[20px_13px]',
                index % 2 === 1 && 'border-l-0',
                index >= 6 && 'border-b-0',
              )}
            >
              <LandingIcon
                name={module.icon}
                className="mt-[3px] size-[21px] text-[#a96c0c] max-[600px]:size-[17px] max-[800px]:size-[17px]"
              />

              <div>
                <Span className="block text-[12px] font-[650] max-[600px]:text-[10px] max-[800px]:text-[10px]">
                  {module.title}
                </Span>
                <Small className="mt-[3px] block text-[10px] text-[#746b60] max-[600px]:text-[9px] max-[600px]:leading-[1.9] max-[800px]:text-[9px]">
                  {module.description}
                </Small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-between gap-5 text-[10px] text-[#746b60] max-[600px]:flex-col max-[600px]:gap-[7px] max-[600px]:text-[9px] [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-[6px] [&_svg]:size-[13px]">
        <Span className='text-[10px]'>
          <LandingIcon name="link" />
          طرف‌حساب‌ها، فایل‌ها و برنامه‌های عملیاتی، مشترک بین همه بخش‌ها
        </Span>
        <span>تمرکز نسخه نخست: جریان‌های اصلی مالی شرکت</span>
      </div>
    </section>
  );
}
