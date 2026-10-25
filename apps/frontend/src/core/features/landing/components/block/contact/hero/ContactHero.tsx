import { H1, P, Span } from '@/core/components/custom/ui/typography/Typography';
export function ContactHero() {
  return (
    <section className="py-8 sm:py-12">
      <div className="mx-auto max-w-200 text-center">
        <Span className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">
          تماس با ما
        </Span>
        <H1 className="my-4 leading-relaxed tracking-tighter text-3xl sm:text-5xl">
          از نیاز مالی شرکت‌تان،
          <br />
          <Span className="text-[length:inherit] text-brand-link">برایمان بگویید.</Span>
        </H1>
        <P className="mx-auto max-w-144 text-xs leading-loose text-muted-foreground sm:text-sm">
          سؤال درباره محصول، انتخاب پلن یا شروع همکاری دارید؟ موضوع را انتخاب کنید و پیامتان را
          بنویسید.
        </P>
      </div>
    </section>
  );
}
