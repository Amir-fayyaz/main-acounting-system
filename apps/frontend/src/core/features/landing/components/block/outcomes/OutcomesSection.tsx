import { H2, Span, P } from '@/core/components/custom/ui/typography/Typography';
import { industryTags, outcomeAssurances } from '@/core/features/landing/assets/mock/workspace';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import {
  landingContainerClass,
  landingEyebrowClass,
} from '@/core/features/landing/lib/landing-classes';
import { cn } from '@/core/utils/shadcn/utils';

export function OutcomesSection() {
  return (
    <div className={landingContainerClass}>
      <section
        id="results"
        aria-labelledby="proof-title"
        className="pt-[10px] pb-0 max-[680px]:pt-0"
      >
        <div className="mb-[27px] flex items-end justify-between gap-10 max-[680px]:mb-6 max-[680px]:block max-[850px]:gap-[30px]">
          <div>
            <Span className={landingEyebrowClass}>برای روزهای پرکار، برای مسیر بلندمدت.</Span>

            <H2
              id="proof-title"
              className="mt-3 text-[36px] leading-[1.7] font-[800] tracking-[-1.1px] max-[440px]:text-[27px] max-[680px]:text-[29px] max-[680px]:leading-[1.75] max-[850px]:text-[30px]"
            >
              اعتماد،
              <br />
              در مقیاس کار شما.
            </H2>
          </div>

          <div className="max-w-[300px] max-[680px]:mt-[15px] max-[680px]:max-w-[400px] max-[850px]:max-w-[230px]">
            <P className="text-[12px] leading-[2.1] text-[#746b60] max-[680px]:text-[11px]">
              از یک تیم کوچک تا هزاران رویداد مالی؛ تمرکز روی تداوم کار، ثبات اطلاعات و حساب‌های
              قابل اتکا.
            </P>
            <Span className={cn('sampleLabelClass mt-[11px] max-[680px]:mt-2.5')}>
              <LandingIcon name="info" />
              آمار نمایشی · پیش‌نمایش طراحی
            </Span>
          </div>
        </div>

        <div className="grid grid-cols-[1.05fr_1fr_1fr] gap-[17px] max-[440px]:gap-[11px] max-[680px]:grid-cols-2 max-[680px]:gap-[13px] max-[850px]:gap-3">
          <article
            className={cn(
              'cardClass border-[#ffa00a] bg-[#ffa00a] text-[#1a120a] max-[440px]:min-h-[220px] max-[440px]:p-[24px_22px] max-[350px]:gap-x-[13px] max-[350px]:px-[18px] max-[680px]:col-span-2 max-[680px]:grid max-[680px]:min-h-[230px] max-[680px]:grid-cols-[1fr_1.1fr] max-[680px]:content-center max-[680px]:gap-x-[22px] max-[680px]:p-[25px_28px]',
            )}
          >
            <Span
              className={cn(
                'labelClass max-[680px]:col-start-2 max-[680px]:row-start-1 max-[680px]:mt-1.5 max-[680px]:text-[13px] max-[440px]:text-[11px]',
              )}
            >
              <LandingIcon name="users" />
              کسب‌وکار همراه
            </Span>

            <Span
              className={cn(
                'numberClass max-[680px]:col-start-1 max-[680px]:row-[1/3] max-[680px]:mt-0 max-[680px]:self-center max-[680px]:text-[51px] max-[680px]:tracking-[-1.7px] max-[440px]:text-[43px] max-[350px]:text-[36px]',
              )}
            >
              <bdi dir="ltr">۲٬۴۰۰+</bdi>
            </Span>

            <P
              className={cn(
                'textClass text-[#603b08] max-[680px]:col-start-2 max-[680px]:row-start-2 max-[680px]:mt-2 max-[680px]:text-[11px] max-[440px]:text-[10px]',
              )}
            >
              تیم‌های مالی، با یک زبان مشترک.
            </P>

            <div className="mt-auto flex flex-wrap gap-[6px] pt-[29px] max-[440px]:gap-1.5 max-[680px]:col-span-2 max-[680px]:gap-2 max-[680px]:pt-[23px] max-[850px]:gap-[5px] [&_span]:flex [&_span]:items-center [&_span]:gap-[5px] [&_span]:rounded-[5px] [&_span]:border [&_span]:border-[#b775124d] [&_span]:bg-[#ffb333] [&_span]:px-2 [&_span]:py-[5px] [&_span]:text-[10px] [&_svg]:size-[13px] max-[440px]:[&_span]:p-[4px_7px] max-[440px]:[&_span]:text-[9px] max-[680px]:[&_span]:px-[9px] max-[680px]:[&_span]:py-[5px] max-[680px]:[&_span]:text-[10px] max-[850px]:[&_span]:p-[4px_6px] max-[850px]:[&_span]:text-[9px]">
              {industryTags.map((tag) => (
                <Span key={tag.label}>
                  <LandingIcon name={tag.icon} />
                  {tag.label}
                </Span>
              ))}
            </div>
          </article>

          <article
            className={cn(
              'cardClass bg-[#fffdf8] max-[440px]:p-[20px_14px] max-[680px]:min-h-[266px] max-[680px]:p-[23px_18px]',
            )}
          >
            <Span className={cn('labelClass [&_svg]:text-[#52836a]')}>
              <LandingIcon name="clock" />
              دسترس‌پذیری سرویس
            </Span>

            <Span className="numberClass">۹۹٫۹٪</Span>

            <P className={cn('textClass text-[#756953]')}>
              برای روزهایی که حساب‌ها منتظر نمی‌مانند.
            </P>

            <div
              role="img"
              aria-label="نمای نمونه دسترس‌پذیری در ۳۰ روز"
              className="mt-auto flex gap-[3px] pt-7 [direction:ltr] max-[440px]:[&>i]:h-[25px] max-[680px]:pt-[27px] max-[680px]:[&>i]:h-[30px] max-[850px]:gap-[2px] [&>i]:h-8 [&>i]:min-w-0 [&>i]:flex-1 [&>i]:rounded-[2px] [&>i]:bg-[#5f8a70] [&>i:nth-child(11)]:h-6 [&>i:nth-child(11)]:self-end [&>i:nth-child(9n)]:bg-[#acc3a9]"
            >
              {Array.from({ length: 30 }, (_, index) => (
                <i key={index} />
              ))}
            </div>

            <div className="mt-[7px] flex justify-between">
              <Span className="text-[9px] text-[#7d705c] max-[440px]:text-[7px] max-[680px]:text-[8px] max-[850px]:text-[8px]">
                ۳۰ روز گذشته · نمونه
              </Span>
              <Span className="text-[9px] text-[#7d705c] max-[440px]:text-[7px] max-[680px]:text-[8px] max-[850px]:text-[8px]">
                امروز
              </Span>
            </div>
          </article>

          <article
            className={cn(
              'cardClass border-[#231b12] bg-[#231b12] text-[#fff7e8] max-[440px]:p-[20px_14px] max-[680px]:min-h-[266px] max-[680px]:p-[23px_18px]',
            )}
          >
            <Span className={cn('labelClass text-[#dcc39b] [&_svg]:text-[#ffa00a]')}>
              <LandingIcon name="receipt" />
              فاکتور ثبت‌شده
            </Span>

            <Span
              className={cn(
                'numberClass max-[1050px]:text-[36px] max-[350px]:text-[21px] max-[440px]:text-[23px] max-[440px]:tracking-[-0.7px] max-[680px]:text-[28px] max-[850px]:text-[30px]',
              )}
            >
              ۱۲ میلیون
            </Span>

            <P className={cn('textClass text-[#c8b89d]')}>هر فاکتور، بخشی از یک تصویر بزرگ‌تر.</P>

            <svg
              role="img"
              aria-label="نمودار نمونه افزایش تعداد اسناد"
              viewBox="0 0 260 60"
              preserveAspectRatio="none"
              className="mt-auto block h-[66px] w-full overflow-visible pt-3.5 max-[680px]:h-[65px]"
            >
              <path d="M0 48H260M0 25H260" stroke="#58442b" strokeWidth=".6" />
              <path
                d="M2 47 28 44 51 46 75 34 99 37 123 24 148 29 171 15 194 20 217 8 239 13 258 2"
                stroke="#ffa00a"
                strokeWidth="2.2"
              />
              <circle cx="258" cy="2" r="3" fill="#ffa00a" stroke="none" />
            </svg>

            <div className="mt-[5px] flex justify-between">
              <Span className="text-[9px] text-[#c4ad88] max-[440px]:text-[7px] max-[680px]:text-[8px] max-[850px]:text-[8px]">
                یک مسیر پیوسته
              </Span>
              <Span className="text-[9px] text-[#c4ad88] max-[440px]:text-[7px] max-[680px]:text-[8px] max-[850px]:text-[8px]">
                تا دفتر کل
              </Span>
            </div>
          </article>
        </div>

        <P className="mt-[13px] flex items-center gap-[5px] text-[10px] text-[#796e5d] max-[440px]:text-[8px] max-[680px]:mt-3 max-[680px]:items-start max-[680px]:text-[9px] max-[680px]:leading-[2] [&_svg]:size-3 max-[680px]:[&_svg]:mt-[3px] max-[680px]:[&_svg]:shrink-0">
          <LandingIcon name="info" />
          اعداد این بخش نمونه‌اند و آمار واقعی عملکرد یا مشتریان تراز نیستند.
        </P>

        <div className="mt-[29px] grid grid-cols-3 gap-5 border-y border-[#e7e1d4] py-5 max-[1050px]:gap-[15px] max-[680px]:mt-[23px] max-[680px]:grid-cols-1 max-[680px]:gap-0 max-[680px]:border-b-0 max-[680px]:p-0 max-[850px]:[&>div]:gap-2 max-[850px]:[&>div]:pl-3 max-[850px]:[&_small]:text-[9px] max-[850px]:[&_strong]:text-[10px] max-[850px]:[&_svg]:size-[19px] [&>div]:flex [&>div]:items-center [&>div]:gap-3 [&>div]:border-l [&>div]:border-[#e0d8c7] [&>div]:pl-5 [&>div:last-child]:border-0 [&>div:last-child]:pl-0 max-[1050px]:[&>div]:gap-[9px] max-[1050px]:[&>div]:pl-[15px] max-[1050px]:[&_strong]:text-[11px] max-[680px]:[&>div]:gap-3 max-[680px]:[&>div]:border-0 max-[680px]:[&>div]:border-b max-[680px]:[&>div]:border-[#e7e1d4] max-[680px]:[&>div]:py-[17px] max-[680px]:[&>div:last-child]:border-b max-[680px]:[&>div:last-child]:pb-[17px] max-[680px]:[&_small]:text-[10px] max-[680px]:[&_strong]:text-[12px] max-[680px]:[&_svg]:size-[22px] max-[850px]:[&>div]:gap-2 max-[850px]:[&>div]:pl-3 [&_svg]:size-[22px] [&_svg]:text-[#9a6c25] [&_small]:mt-[3px] [&_small]:block [&_small]:text-[10px] [&_small]:leading-[1.8] [&_small]:text-[#746b60] [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-[650]">
          {outcomeAssurances.map((assurance) => (
            <div key={assurance.title}>
              <LandingIcon name={assurance.icon} />
              <Span>
                <strong>{assurance.title}</strong>
                <small>{assurance.description}</small>
              </Span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
