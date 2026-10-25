import { H2, P, Small, Span } from '@/core/components/custom/ui/typography/Typography';
import { industryTags, outcomeAssurances } from '@/core/features/landing/assets/mock/workspace';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@/core/utils/shadcn/utils';

export function OutcomesSection() {
  return (
    <section className="py-8 sm:py-12">
      <div id="results" aria-labelledby="proof-title">
        <div className="mb-7 flex items-end justify-between gap-10 max-md:mb-6 max-md:block max-lg:gap-7">
          <div>
            <Span className="landingEyebrowClass">برای روزهای پرکار، برای مسیر بلندمدت.</Span>

            <H2
              id="proof-title"
              className="mt-3 text-4xl leading-relaxed font-extrabold tracking-tighter max-md:text-3xl max-lg:text-3xl"
            >
              اعتماد،
              <br />
              در مقیاس کار شما.
            </H2>
          </div>

          <div className="max-w-72 max-md:mt-3.5 max-md:max-w-96 max-lg:max-w-56">
            <P className="text-xs leading-loose text-[#746b60]">
              از یک تیم کوچک تا هزاران رویداد مالی؛ تمرکز روی تداوم کار، ثبات اطلاعات و حساب‌های
              قابل اتکا.
            </P>
            <Span className={cn('sampleLabelClass mt-2.5 max-md:mt-2.5')}>
              <LandingIcon name="info" />
              آمار نمایشی · پیش‌نمایش طراحی
            </Span>
          </div>
        </div>

        <div className="grid grid-cols-[1.05fr_1fr_1fr] gap-4 max-md:grid-cols-2 max-md:gap-3 max-lg:gap-3">
          <article
            className={cn(
              'cardClass border-[#ffa00a] bg-[#ffa00a] text-[#1a120a] max-md:col-span-2 max-md:grid max-md:min-h-56 max-md:grid-cols-[1fr_1.1fr] max-md:content-center max-md:gap-x-5 max-md:py-6 max-md:px-7',
            )}
          >
            <Span
              className={cn(
                'labelClass max-md:col-start-2 max-md:row-start-1 max-md:mt-1.5 max-md:text-xs',
              )}
            >
              <LandingIcon name="users" />
              کسب‌وکار همراه
            </Span>

            <Span
              className={cn(
                'numberClass max-md:col-start-1 max-md:row-span-2 max-md:mt-0 max-md:self-center max-md:text-5xl max-md:tracking-tighter',
              )}
            >
              <bdi dir="ltr">
                <Span className="text-[length:inherit]">۲٬۴۰۰+</Span>
              </bdi>
            </Span>

            <P
              className={cn(
                'textClass text-[#603b08] max-md:col-start-2 max-md:row-start-2 max-md:mt-2 max-md:text-xs',
              )}
            >
              تیم‌های مالی، با یک زبان مشترک.
            </P>

            <div className="mt-auto flex flex-wrap gap-1.5 pt-7 max-md:col-span-2 max-md:gap-2 max-md:pt-6 max-lg:gap-1 [&_span]:flex [&_span]:items-center [&_span]:gap-1 [&_span]:rounded-sm [&_span]:border [&_span]:border-[#b775124d] [&_span]:bg-[#ffb333] [&_span]:px-2 [&_span]:py-1 [&_span]:text-xs [&_svg]:size-3 max-md:[&_span]:px-2 max-md:[&_span]:py-1 max-md:[&_span]:text-xs max-lg:[&_span]:py-1 max-lg:[&_span]:px-1.5 max-lg:[&_span]:text-xs">
              {industryTags.map((tag) => (
                <Span className="text-[length:inherit]" key={tag.label}>
                  <LandingIcon name={tag.icon} />
                  {tag.label}
                </Span>
              ))}
            </div>
          </article>

          <article className={cn('cardClass bg-[#fffdf8] max-md:min-h-64 max-md:py-6 max-md:px-4')}>
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
              className="mt-auto flex gap-0.5 pt-7 [direction:ltr] max-md:[&>i]:h-7 [&>i]:h-8 [&>i]:min-w-0 [&>i]:flex-1 [&>i]:rounded-sm [&>i]:bg-[#5f8a70] [&>i:nth-child(11)]:h-6 [&>i:nth-child(11)]:self-end [&>i:nth-child(9n)]:bg-[#acc3a9]"
            >
              {Array.from({ length: 30 }, (_, index) => (
                <i key={index} />
              ))}
            </div>

            <div className="mt-1.5 flex justify-between">
              <Span className="text-xs text-[#7d705c]">۳۰ روز گذشته · نمونه</Span>
              <Span className="text-xs text-[#7d705c]">امروز</Span>
            </div>
          </article>

          <article
            className={cn(
              'cardClass border-[#231b12] bg-[#231b12] text-[#fff7e8] max-md:min-h-64 max-md:py-6 max-md:px-4',
            )}
          >
            <Span className={cn('labelClass text-[#dcc39b] [&_svg]:text-[#ffa00a]')}>
              <LandingIcon name="receipt" />
              فاکتور ثبت‌شده
            </Span>

            <Span className={cn('numberClass max-xl:text-4xl max-md:text-3xl max-lg:text-3xl')}>
              ۱۲ میلیون
            </Span>

            <P className={cn('textClass text-[#c8b89d]')}>هر فاکتور، بخشی از یک تصویر بزرگ‌تر.</P>

            <svg
              role="img"
              aria-label="نمودار نمونه افزایش تعداد اسناد"
              viewBox="0 0 260 60"
              preserveAspectRatio="none"
              className="mt-auto block h-16 w-full overflow-visible pt-3.5 max-md:h-16"
            >
              <path d="M0 48H260M0 25H260" stroke="#58442b" strokeWidth=".6" />
              <path
                d="M2 47 28 44 51 46 75 34 99 37 123 24 148 29 171 15 194 20 217 8 239 13 258 2"
                stroke="#ffa00a"
                strokeWidth="2.2"
              />
              <circle cx="258" cy="2" r="3" fill="#ffa00a" stroke="none" />
            </svg>

            <div className="mt-1 flex justify-between">
              <Span className="text-xs text-[#c4ad88]">یک مسیر پیوسته</Span>
              <Span className="text-xs text-[#c4ad88]">تا دفتر کل</Span>
            </div>
          </article>
        </div>

        <P className="mt-3 flex items-center gap-1 text-xs text-[#796e5d] max-md:items-start max-md:leading-loose [&_svg]:size-3 max-md:[&_svg]:mt-0.5 max-md:[&_svg]:shrink-0">
          <LandingIcon name="info" />
          اعداد این بخش نمونه‌اند و آمار واقعی عملکرد یا مشتریان تراز نیستند.
        </P>

        <div className="mt-7 grid grid-cols-3 gap-5 border-y border-[#e7e1d4] py-5 max-xl:gap-3.5 max-md:mt-6 max-md:grid-cols-1 max-md:gap-0 max-md:border-b-0 max-md:p-0 max-lg:[&_small]:text-xs max-lg:[&_strong]:text-xs max-lg:[&_svg]:size-5 [&>div]:flex [&>div]:items-center [&>div]:gap-3 [&>div]:border-l [&>div]:border-[#e0d8c7] [&>div]:pl-5 [&>div:last-child]:border-0 [&>div:last-child]:pl-0 max-xl:[&>div]:gap-2 max-xl:[&>div]:pl-3.5 max-xl:[&_strong]:text-xs max-md:[&>div]:gap-3 max-md:[&>div]:border-0 max-md:[&>div]:border-b max-md:[&>div]:border-[#e7e1d4] max-md:[&>div]:py-4 max-md:[&>div:last-child]:border-b max-md:[&>div:last-child]:pb-4 max-md:[&_small]:text-xs max-md:[&_strong]:text-xs max-md:[&_svg]:size-5 max-lg:[&>div]:gap-2 max-lg:[&>div]:pl-3 [&_svg]:size-5 [&_svg]:text-[#9a6c25] [&_small]:mt-0.5 [&_small]:block [&_small]:text-xs [&_small]:leading-relaxed [&_small]:text-[#746b60] [&_strong]:block [&_strong]:text-xs [&_strong]:font-semibold">
          {outcomeAssurances.map((assurance) => (
            <div key={assurance.title}>
              <LandingIcon name={assurance.icon} />
              <Span className="text-[length:inherit]">
                <strong>
                  <Span className="text-[length:inherit]">{assurance.title}</Span>
                </strong>
                <Small>{assurance.description}</Small>
              </Span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
