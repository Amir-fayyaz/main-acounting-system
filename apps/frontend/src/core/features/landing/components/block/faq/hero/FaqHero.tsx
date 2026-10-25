import SectionLayout from '@/core/components/custom/ui/wrapper/SectionLayout';

import { H1, P, Span } from '@/core/components/custom/ui/typography/Typography';
export function FaqHero() {
  return (
    <SectionLayout className="py-8 sm:py-12">
      <div className="mx-auto max-w-200 text-center">
        <Span className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">
          پرسش‌های متداول
        </Span>
        <H1 className="my-4 leading-relaxed tracking-tighter text-3xl sm:text-5xl">
          پاسخ روشن،
          <br />
          <Span className="text-[length:inherit] text-brand-link">قبل از قدم بعدی.</Span>
        </H1>
        <P className="mx-auto max-w-144 text-xs leading-loose text-muted-foreground sm:text-sm">
          درباره شروع کار، جریان‌های مالی، اختیار حسابدار و این پیش‌نمایش بخوانید.
        </P>
      </div>
    </SectionLayout>
  );
}
