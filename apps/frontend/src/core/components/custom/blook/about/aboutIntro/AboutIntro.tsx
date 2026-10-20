import Eyebrow from '@/core/components/custom/ui/eyebrow/Eyebrow';
import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';
import type { TarazIconName } from '@/core/components/custom/ui/icons/TarazIcon';
import { Button } from '@/shadcn/button/button';
import Link from 'next/link';

export interface CycleStep {
  icon: TarazIconName;
  title: string;
  note: string;
}

export interface AboutIntroProps {
  eyebrow?: string;
  titleLead?: string;
  titleAccent?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  visualTitle?: string;
  visualNote?: string;
  steps?: CycleStep[];
}

const defaultSteps: CycleStep[] = [
  { icon: 'file', title: 'اطلاعات و مستندات', note: 'یک‌بار ورود' },
  { icon: 'spark', title: 'پیشنهاد آماده بررسی', note: 'همراه با دلیل' },
  { icon: 'check', title: 'تأیید حسابدار', note: 'اختیار با شما' },
];

function AboutIntro({
  eyebrow = 'درباره تراز',
  titleLead = 'از سمت حسابدار،',
  titleAccent = 'به کار نگاه می‌کنیم.',
  description = 'تراز یک سامانه مالی و حسابداری برای شرکت‌های ایرانی است؛ با یک هدف روشن: کمتر شدن کار تکراری و بیشتر شدن تسلط حسابدار بر جریان مالی.',
  ctaLabel = 'تراز را در عمل ببینید',
  ctaHref = '/demo',
  visualTitle = 'از ورود دستی،\nبه پیشنهاد و تأیید.',
  visualNote = 'یک رویداد، یک مسیر روشن؛ از مستند اولیه تا دفتر کل.',
  steps = defaultSteps,
}: AboutIntroProps) {
  const [visualLead, visualAccent] = visualTitle.split('\n');

  return (
    <section className="grid items-center gap-[29px] pt-10 pb-[29px] max-taraz-sm:grid-cols-1 max-taraz-xl:gap-[30px] max-taraz-xl:pt-[50px] max-taraz-3xl:gap-[45px] max-taraz-3xl:pt-[68px] max-taraz-3xl:pb-[45px] sm:grid-cols-[1.1fr_1fr]">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>

        <h1 className="my-[18px] text-[33px] leading-[1.75] tracking-[-1px] max-taraz-sm:my-4 max-taraz-xl:text-[34px] max-taraz-3xl:text-[39px] sm:text-[46px] sm:leading-[1.7] sm:tracking-[-1.7px]">
          {titleLead}
          <br />
          <span className="text-accent-text">{titleAccent}</span>
        </h1>

        <p className="max-w-[500px] text-xs leading-[2.3] text-muted-foreground max-taraz-xl:text-xs sm:text-sm">
          {description}
        </p>

        <Button
          asChild
          className="mt-[21px] min-h-[42px] gap-2.5 rounded-lg px-[17px] text-[11px] font-semibold max-taraz-xl:mt-[25px] sm:mt-[25px] sm:min-h-12 sm:px-6 sm:text-xs"
        >
          <Link href={ctaHref}>
            {ctaLabel}
            <TarazIcon className="size-4 sm:size-[19px]" name="arrow" />
          </Link>
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-[15px] bg-visual p-[25px] text-visual-foreground sm:p-[31px]">
        <h2 className="mb-2 whitespace-pre-line text-2xl leading-[1.8] tracking-[-0.7px] max-taraz-xl:text-[22px] sm:text-[24px]">
          {visualLead}
          {'\n'}
          {visualAccent}
        </h2>

        <p className="text-[11px] leading-5 text-visual-muted">{visualNote}</p>

        <div className="mt-[22px] flex flex-col gap-3 sm:mt-[25px]">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;

            return (
              <div
                className={`flex items-center gap-3 rounded-[7px] border px-3 py-3 text-xs max-taraz-xl:px-[11px] max-taraz-xl:py-[11px] max-taraz-xl:text-[11px] sm:px-[15px] sm:py-[13px] sm:text-xs ${
                  isLast
                    ? 'border-brand bg-brand text-ink'
                    : 'border-cycle-line bg-cycle-card'
                }`}
                key={step.title}
              >
                <TarazIcon
                  className={`size-5 ${isLast ? 'text-cycle-accent' : 'text-brand'}`}
                  name={step.icon}
                />
                <strong className="font-semibold">{step.title}</strong>
                <small
                  className={`ms-auto text-[10px] ${isLast ? 'text-cycle-accent' : 'text-cycle-note'}`}
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

export default AboutIntro;
