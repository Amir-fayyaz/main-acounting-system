import { BankMatchScene } from '@/core/features/landing/components/ui/capabilities/BankMatchScene';
import { ReportScene } from '@/core/features/landing/components/ui/capabilities/ReportScene';
import { SalesScene } from '@/core/features/landing/components/ui/capabilities/SalesScene';
import { StockScene } from '@/core/features/landing/components/ui/capabilities/StockScene';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';
import type { LandingIconName } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { H2, H3, P, Span } from '@/core/components/custom/ui/typography/Typography';

export function CapabilitiesSection() {
  return (
    <section className="py-8 sm:py-12">
      <div id="features" aria-labelledby="features-title">
        <div className="mb-8 grid grid-cols-[1.4fr_1fr] items-end gap-14 max-xl:gap-9 max-md:mb-6 max-md:block max-lg:gap-6">
          <div>
            <Span className="landingEyebrowClass">کمتر ثبت کنید. بیشتر بدانید. / ۰۱</Span>

            <H2
              id="features-title"
              className="mt-3 text-4xl leading-relaxed font-extrabold tracking-tighter max-md:text-3xl max-lg:text-3xl"
            >
              هر بخش، سر جای خودش.
              <br />
              <Span className="text-[length:inherit] text-[#a86400]">همه‌چیز، در یک جریان.</Span>
            </H2>
          </div>

          <P className="mr-auto mb-1.5 max-w-80 text-xs leading-loose text-[#746b60] max-md:mt-3.5 max-md:mx-0 max-md:mb-0 max-md:max-w-112">
            فروش، انبار، بانک و حسابداری از هم جدا نیستند. یک‌بار اطلاعات را وارد کنید و اثرش را در
            تمام مسیر ببینید.
          </P>
        </div>

        <div className="grid grid-cols-12 gap-5 max-md:grid-cols-1 max-md:gap-4 max-lg:gap-4">
          <article
            className={cn(
              'cardClass col-span-7 flex min-h-128 flex-col border-[#eeeade] bg-[#eeeade] max-md:min-h-0',
            )}
          >
            <div className={cn('copyClass pl-14 max-xl:pl-7 max-md:pt-6 max-md:px-7 max-md:pb-0')}>
              <CapKicker icon="receipt" label="فروش و دریافتنی‌ها" />

              <H3 className="headingClass">
                از اولین فاکتور،
                <br />
                تا آخرین سطر دفتر کل.
              </H3>

              <P className="textClass">
                فاکتور، حواله و پیش‌نویس سند به هم مرتبط‌اند؛ بدون ثبت دوباره اطلاعات.
              </P>
            </div>

            <SalesScene />
          </article>

          <article
            className={cn(
              'cardClass col-span-5 flex min-h-128 flex-col border-[#231b12] bg-[#231b12] max-md:min-h-0',
            )}
          >
            <div className="copyClass">
              <CapKicker icon="bank" label="بانک و تطبیق" dark />

              <H3 className={cn('headingClass text-3xl! text-[#fff8ea]')}>
                این واریزی،
                <br />
                برای کدام فاکتور بود؟
              </H3>

              <P className={cn('textClass text-[#ccbea9]')}>
                تراز تطبیق را پیشنهاد می‌دهد؛ شما مستندات را بررسی و دریافت را تأیید می‌کنید.
              </P>
            </div>

            <BankMatchScene />
          </article>

          <article
            className={cn(
              'cardClass col-span-5 min-h-96 border-[#ffa00a] bg-[#ffa00a] max-md:min-h-0',
            )}
          >
            <div
              className={cn(
                'copyClass max-md:pt-6 max-md:px-7 max-md:pb-0 max-lg:pt-6 max-lg:px-5 max-lg:pb-0',
              )}
            >
              <Span className="flex! items-center gap-2 text-xs! font-medium! text-[#603a08] [&_svg]:size-4 [&_svg]:text-[#67400a]">
                <LandingIcon name="box" />
                کالا و موجودی
              </Span>

              <H3 className={cn('headingClass text-2xl!')}>خبرِ انبار را، همان لحظه بگیرید.</H3>

              <P className={cn('textClass text-[#603a08]')}>
                ورود، خروج و حداقل موجودی؛ همگام با خرید و فروش.
              </P>
            </div>

            <StockScene />
          </article>

          <article className={cn('cardClass col-span-7 min-h-96 bg-[#fffdf8] max-md:min-h-0')}>
            <div
              className={cn(
                'copyClass max-md:pt-6 max-md:px-7 max-md:pb-0 max-lg:pt-6 max-lg:px-5 max-lg:pb-0',
              )}
            >
              <CapKicker icon="chart" label="گزارش‌های مالی" />

              <H3 className="headingClass">
                فقط عدد نبینید.
                <br />
                تصویر مالی کسب‌وکارتان را ببینید.
              </H3>

              <P className="textClass">سود و زیان، ترازنامه و نقدینگی؛ قابل پیگیری تا سند اولیه.</P>
            </div>

            <ReportScene />
          </article>
        </div>
      </div>
    </section>
  );
}

function CapKicker({
  icon,
  label,
  dark = false,
}: {
  icon: LandingIconName;
  label: string;
  dark?: boolean;
}) {
  return (
    <Span
      className={cn(
        'text-[length:inherit]',
        cn(dark && 'kickerClass text-[#d6b784] [&_svg]:text-[#ffa00a]'),
      )}
    >
      <LandingIcon name={icon} />
      {label}
    </Span>
  );
}
