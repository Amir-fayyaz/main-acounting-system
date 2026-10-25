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
    <section
      id="features"
      aria-labelledby="features-title"
      className={cn(
        'landingContainerClass pt-[76px] pb-[78px] max-[680px]:pt-[53px] max-[680px]:pb-[54px]',
      )}
    >
      <div className="mb-[34px] grid grid-cols-[1.4fr_1fr] items-end gap-[60px] max-[1050px]:gap-[35px] max-[680px]:mb-[25px] max-[680px]:block max-[850px]:grid-cols-[1.4fr_1fr] max-[850px]:gap-[25px]">
        <div>
          <Span className="landingEyebrowClass">کمتر ثبت کنید. بیشتر بدانید. / ۰۱</Span>

          <H2
            id="features-title"
            className="mt-[13px] text-[39px] leading-[1.65] font-[800] tracking-[-1.3px] max-[1050px]:text-[34px] max-[440px]:text-[27px] max-[680px]:text-[30px] max-[680px]:leading-[1.7] max-[680px]:tracking-[-1px] max-[850px]:text-[30px]"
          >
            هر بخش، سر جای خودش.
            <br />
            <span className="text-[#a86400]">همه‌چیز، در یک جریان.</span>
          </H2>
        </div>

        <P className="mr-auto mb-[7px] max-w-[330px] text-[13px] leading-[2.2] text-[#746b60] max-[440px]:text-[11px] max-[680px]:m-[15px_0_0] max-[680px]:max-w-[420px] max-[680px]:leading-[2.1] max-[850px]:text-[12px]">
          فروش، انبار، بانک و حسابداری از هم جدا نیستند. یک‌بار اطلاعات را وارد کنید و اثرش را در
          تمام مسیر ببینید.
        </P>
      </div>

      <div className="grid grid-cols-12 gap-5 max-[680px]:grid-cols-1 max-[680px]:gap-4 max-[850px]:gap-4">
        <article
          className={cn(
            'cardClass col-span-7 flex min-h-[525px] flex-col border-[#eeeade] bg-[#eeeade] max-[1050px]:min-h-[490px] max-[680px]:min-h-0 max-[850px]:min-h-[490px]',
          )}
        >
          <div
            className={cn(
              'copyClass pl-[60px] max-[1050px]:pl-[30px] max-[680px]:p-[26px_27px_0]',
            )}
          >
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
            'cardClass col-span-5 flex min-h-[525px] flex-col border-[#231b12] bg-[#231b12] max-[1050px]:min-h-[490px] max-[680px]:min-h-0 max-[850px]:min-h-[490px]',
          )}
        >
          <div className="copyClass">
            <CapKicker icon="bank" label="بانک و تطبیق" dark />

            <H3 className={cn('headingClass !text-[28px] text-[#fff8ea]')}>
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
            'cardClass col-span-5 min-h-[370px] border-[#ffa00a] bg-[#ffa00a] max-[680px]:min-h-0',
          )}
        >
          <div
            className={cn(
              'copyClass max-[680px]:p-[26px_27px_0] max-[850px]:p-[23px_22px_0]',
            )}
          >
            <Span className="!flex items-center gap-2 !text-[11px] !font-[550] text-[#603a08] [&_svg]:size-4 [&_svg]:text-[#67400a] max-[850px]:!text-[10px] max-[680px]:!text-[11px] max-[440px]:!text-[10px]">
              <LandingIcon name="box" />
              کالا و موجودی
            </Span>

            <H3
              className={cn(
                'headingClass !text-[26px] max-[1050px]:!text-[24px] max-[850px]:!text-[23px] max-[680px]:!text-[27px] max-[440px]:!text-[25px] max-[350px]:!text-[23px]',
              )}
            >
              خبرِ انبار را، همان لحظه بگیرید.
            </H3>

            <P className={cn('textClass text-[#603a08]')}>
              ورود، خروج و حداقل موجودی؛ همگام با خرید و فروش.
            </P>
          </div>

          <StockScene />
        </article>

        <article
          className={cn(
            'cardClass col-span-7 min-h-[370px] bg-[#fffdf8] max-[680px]:min-h-0',
          )}
        >
          <div
            className={cn(
              'copyClass max-[680px]:p-[26px_27px_0] max-[850px]:p-[23px_22px_0]',
            )}
          >
            <CapKicker icon="chart" label="گزارش‌های مالی" />

            <H3 className="headingClass">
              فقط عدد نبینید.
              <br />
              تصویر مالی کسب‌وکارتان را ببینید.
            </H3>

            <P className="textClass">
              سود و زیان، ترازنامه و نقدینگی؛ قابل پیگیری تا سند اولیه.
            </P>
          </div>

          <ReportScene />
        </article>
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
    <span className={cn(dark && 'kickerClass text-[#d6b784] [&_svg]:text-[#ffa00a]')}>
      <LandingIcon name={icon} />
      {label}
    </span>
  );
}
