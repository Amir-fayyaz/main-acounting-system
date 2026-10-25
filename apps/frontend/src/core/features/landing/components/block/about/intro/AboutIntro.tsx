import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shadcn/button/button';
import { cn } from '@/core/utils/shadcn/utils';
import { aboutSteps } from '@/core/features/landing/assets/mock/about';

export function AboutIntro() {
  return (
    <section className="grid items-center gap-[29px] pt-10 pb-[29px] max-[600px]:grid-cols-1 max-[900px]:gap-[30px] max-[900px]:pt-[50px] max-[1100px]:gap-[45px] max-[1100px]:pt-[68px] max-[1100px]:pb-[45px] sm:grid-cols-[1.1fr_1fr]">
      <div>
        <span className="flex items-center gap-[9px] text-xs font-semibold text-brand-link before:h-1.5 before:w-1.5 before:rounded-full before:bg-brand before:content-['']">
          درباره تراز
        </span>
        <h1 className="my-[18px] text-[33px] leading-[1.75] tracking-[-1px] max-[600px]:my-4 max-[900px]:text-[34px] max-[1100px]:text-[39px] sm:text-[46px] sm:leading-[1.7] sm:tracking-[-1.7px]">
          از سمت حسابدار،
          <br />
          <span className="text-brand-link">به کار نگاه می‌کنیم.</span>
        </h1>
        <p className="max-w-[500px] text-xs leading-[2.3] text-muted-foreground max-[900px]:text-xs sm:text-sm">
          تراز یک سامانه مالی و حسابداری برای شرکت‌های ایرانی است؛ با یک هدف روشن: کمتر شدن کار
          تکراری و بیشتر شدن تسلط حسابدار بر جریان مالی.
        </p>
        <Button
          asChild
          className="mt-[21px] min-h-[42px] gap-2.5 rounded-lg px-[17px] text-[11px] font-semibold max-[900px]:mt-[25px] sm:mt-[25px] sm:min-h-12 sm:px-6 sm:text-xs"
        >
          <Link href="/demo">
            تراز را در عمل ببینید
            <ArrowLeft className="size-4 sm:size-[19px]" />
          </Link>
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-[15px] bg-ink-soft p-[25px] text-sand-soft sm:p-[31px]">
        <h2 className="mb-2 whitespace-pre-line text-2xl leading-[1.8] tracking-[-0.7px] max-[900px]:text-[22px] sm:text-[24px]">
          از ورود دستی،
          <br />
          به پیشنهاد و تأیید.
        </h2>
        <p className="text-[11px] leading-5 text-brand-soft/70">
          یک رویداد، یک مسیر روشن؛ از مستند اولیه تا دفتر کل.
        </p>
        <div className="mt-[22px] flex flex-col gap-3 sm:mt-[25px]">
          {aboutSteps.map((step, index) => {
            const isLast = index === aboutSteps.length - 1;
            return (
              <div
                className={cn(
                  'flex items-center gap-3 rounded-[7px] border px-3 py-3 text-xs max-[900px]:px-[11px] max-[900px]:py-[11px] max-[900px]:text-[11px] sm:px-[15px] sm:py-[13px] sm:text-xs',
                  isLast ? 'border-brand bg-brand text-ink' : 'border-sand/20 bg-ink-soft',
                )}
                key={step.title}
              >
                <step.icon className={cn('size-5', isLast ? 'text-ink-soft' : 'text-brand')} />
                <strong className="font-semibold">{step.title}</strong>
                <small
                  className={cn('ms-auto text-[10px]', isLast ? 'text-ink-soft' : 'text-sand/75')}
                >
                  {step.note}
                </small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
