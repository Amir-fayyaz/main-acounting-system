import SectionLayout from '@/core/components/custom/ui/wrapper/SectionLayout';

import { H2, H3, P, Span } from '@/core/components/custom/ui/typography/Typography';
import { aboutPrinciples } from '@/core/features/landing/assets/mock/about';

export function AboutPrinciples() {
  return (
    <SectionLayout className="py-8 sm:py-12">
      <div>
        <Span className="flex items-center gap-2 text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">
          اصولی که روی آن‌ها ساخته می‌شویم
        </Span>
        <H2 className="mt-3 mb-3.5 text-2xl leading-relaxed tracking-tight sm:text-3xl">
          یک ابزار مالی، با قواعد روشن.
        </H2>

        <div className="mt-5 grid gap-0 sm:mt-7 sm:grid-cols-3 sm:gap-6 max-lg:gap-5">
          {aboutPrinciples.map((principle) => (
            <article
              className="border-t border-border py-5 sm:border-t-2 sm:py-6"
              key={principle.number}
            >
              <Span className="text-xs text-brand-link">{principle.number}</Span>
              <H3 className="mt-2 mb-2 text-lg leading-relaxed max-lg:text-base sm:mt-3">
                {principle.title}
              </H3>
              <P className="text-xs leading-loose text-muted-foreground">{principle.description}</P>
            </article>
          ))}
        </div>

        <div className="mt-3.5 rounded-xl border border-border bg-card p-6 sm:mt-6 sm:grid sm:grid-cols-[1fr_2fr] sm:items-center sm:gap-10 sm:p-8">
          <strong className="text-xl leading-relaxed tracking-tight whitespace-pre-line">
            <Span className="text-[length:inherit]">۸ جریان مالی،</Span>
            <br />
            <Span className="text-[length:inherit]">یک تصویر مشترک.</Span>
          </strong>
          <P className="mt-3 text-xs leading-loose text-muted-foreground sm:mt-0">
            خرید، فروش، بانک، هزینه، کنترل مالی، حقوق، مالیات و دارایی ثابت؛ متصل به حسابداری. تمرکز
            نسخه نخست روی جریان‌های کامل و قابل استفاده برای شرکت واقعی است.
          </P>
        </div>
      </div>
    </SectionLayout>
  );
}
