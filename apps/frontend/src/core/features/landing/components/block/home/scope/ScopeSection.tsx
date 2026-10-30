import { H2, H3, P, Small, Span } from '@repo/web/ui';
import { scopeModules } from '@/core/features/landing/assets/mock/workspace';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@repo/web/ui/utils/cn';
import Link from 'next/link';

export function ScopeSection() {
  return (
    <section className="py-8 sm:py-12">
      <div id="scope" aria-labelledby="scope-title">
        <div className="mb-7 flex items-center justify-between gap-6 max-sm:mb-6 max-sm:block">
          <div>
            <Span className="landingEyebrowClass">برای جریان کامل کار / ۰۴</Span>

            <H2 id="scope-title" className="mt-2.5 text-2xl tracking-tight max-sm:leading-relaxed">
              همه بخش‌ها، روی یک دفتر مشترک.
            </H2>
          </div>

          <P className="max-w-72 text-xs text-muted-foreground max-sm:mt-3 max-md:max-w-56">
            از کار روزانه تا پایان دوره؛ بخش‌هایی که یک شرکت واقعی برای مدیریت مالی نیاز دارد.
          </P>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] border-y border-border max-sm:grid-cols-1">
          <div className="relative flex flex-col justify-center overflow-hidden border-l border-border bg-muted py-7 px-6 after:absolute after:-bottom-20 after:-left-9 after:size-48 after:rounded-full after:border after:border-border after:content-[''] max-xl:p-6 max-sm:grid max-sm:grid-cols-[auto_1fr] max-sm:items-center max-sm:gap-x-4 max-sm:border-b max-sm:border-l-0 max-sm:p-6 max-sm:after:-bottom-20 max-sm:after:-left-7 max-sm:after:size-40 max-md:p-5">
            <LandingIcon name="link" className="mb-3 size-7 text-brand-link max-sm:hidden" />

            <Span className="max-xl:text-5xl max-sm:col-start-1 max-sm:row-span-2 max-md:text-5xl text-6xl leading-normal font-extrabold tracking-tighter">
              ۸
            </Span>

            <H3 className="my-1 mb-2 text-xl leading-relaxed tracking-tight max-sm:col-start-2 max-sm:m-0 max-sm:mb-1 max-sm:text-lg max-md:text-base">
              جریان مالی.
              <br />
              یک تصویر مشترک.
            </H3>

            <P className="relative z-1 text-xs leading-loose text-muted-foreground max-sm:col-start-2 max-sm:max-w-56">
              از خرید و فروش تا حقوق، مالیات و بستن دوره؛ متصل به یک دفتر کل.
            </P>

            <Link
              href="#workflow"
              className="relative z-1 mt-5 inline-flex items-center gap-2 text-xs font-semibold text-brand-link max-sm:col-start-2 max-sm:mt-2.5 [&_svg]:size-4"
            >
              <Span className="text-[length:inherit]">دیدن جریان کار</Span>
              <LandingIcon name="arrow" />
            </Link>
          </div>

          <div className="grid grid-cols-2 overflow-hidden">
            {scopeModules.map((module, index) => (
              <div
                key={module.title}
                className={cn(
                  'flex items-start gap-3 border-b border-l border-border py-5 px-6 max-xl:gap-2 max-xl:px-4 max-sm:gap-2 max-sm:py-4 max-sm:px-3 max-sm:[&:nth-child(n+7)]:border-b-0 max-md:gap-1.5 max-md:px-3',
                  index % 2 === 1 && 'border-l-0',
                  index >= 6 && 'border-b-0',
                )}
              >
                <LandingIcon
                  name={module.icon}
                  className="mt-0.5 size-5 text-brand-link max-sm:size-4 max-md:size-4"
                />

                <div>
                  <Span className="block text-xs font-semibold">{module.title}</Span>
                  <Small className="mt-0.5 block text-xs text-muted-foreground max-sm:leading-loose">
                    {module.description}
                  </Small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-between gap-5 text-xs text-muted-foreground max-sm:flex-col max-sm:gap-1.5 [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-1.5 [&_svg]:size-3">
          <Span className="text-xs">
            <LandingIcon name="link" />
            طرف‌حساب‌ها، فایل‌ها و برنامه‌های عملیاتی، مشترک بین همه بخش‌ها
          </Span>
          <Span className="text-[length:inherit]">تمرکز نسخه نخست: جریان‌های اصلی مالی شرکت</Span>
        </div>
      </div>
    </section>
  );
}
