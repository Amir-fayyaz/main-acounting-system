import { Button, H1, H2, P, Small, Span } from '@repo/web/ui';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { cn } from '@repo/web/ui/utils/cn';
import { aboutSteps } from '@/core/features/landing/assets/mock/about';

export function AboutIntro() {
  return (
    <section className="py-8 sm:py-12">
      <div className="grid items-center gap-7 max-sm:grid-cols-1 max-xl:gap-11 sm:grid-cols-[1.1fr_1fr]">
        <div>
          <Span className="flex items-center gap-2 text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">
            درباره تراز
          </Span>
          <H1 className="text-start my-4 leading-relaxed tracking-tighter text-3xl sm:text-5xl">
            از سمت حسابدار،
            <br />
            <Span className="text-[length:inherit] text-brand-link">به کار نگاه می‌کنیم.</Span>
          </H1>
          <P className="max-w-128 text-xs leading-loose text-muted-foreground sm:text-sm">
            تراز یک سامانه مالی و حسابداری برای شرکت‌های ایرانی است؛ با یک هدف روشن: کمتر شدن کار
            تکراری و بیشتر شدن تسلط حسابدار بر جریان مالی.
          </P>
          <Button
            asChild
            className="mt-5 min-h-10 gap-2.5 rounded-lg px-4 text-xs font-semibold max-lg:mt-6 sm:mt-6 sm:min-h-12 sm:px-6"
          >
            <Link href="/demo">
              <Span className="text-[length:inherit]">تراز را در عمل ببینید</Span>
              <ArrowLeft className="size-4 sm:size-5" />
            </Link>
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-ink-soft p-6 text-sand-soft sm:p-8">
          <H2 className="mb-2 whitespace-pre-line text-2xl leading-relaxed tracking-tight max-lg:text-xl">
            از ورود دستی،
            <br />
            به پیشنهاد و تأیید.
          </H2>
          <P className="text-xs leading-5 text-brand-soft/70">
            یک رویداد، یک مسیر روشن؛ از مستند اولیه تا دفتر کل.
          </P>
          <div className="mt-5 flex flex-col gap-3 sm:mt-6">
            {aboutSteps.map((step, index) => {
              const isLast = index === aboutSteps.length - 1;
              return (
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-md border px-3 py-3 text-xs max-lg:px-2.5 max-lg:py-2.5 sm:px-3.5',
                    isLast ? 'border-brand bg-brand text-ink' : 'border-sand/20 bg-ink-soft',
                  )}
                  key={step.title}
                >
                  <step.icon className={cn('size-5', isLast ? 'text-ink-soft' : 'text-brand')} />
                  <strong className="font-semibold">
                    <Span className="text-[length:inherit]">{step.title}</Span>
                  </strong>
                  <Small
                    className={cn('ms-auto text-xs', isLast ? 'text-ink-soft' : 'text-sand/75')}
                  >
                    {step.note}
                  </Small>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
