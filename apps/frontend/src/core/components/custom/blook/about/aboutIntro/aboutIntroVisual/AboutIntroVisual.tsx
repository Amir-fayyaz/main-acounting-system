import { Check, FileText, Sparkles } from 'lucide-react';
import AboutIntroStep from '../aboutIntroStep/AboutIntroStep';
import type { CycleStep } from '../aboutIntroStep/AboutIntroStep';

export interface AboutIntroVisualProps {
  title?: string;
  note?: string;
  steps?: CycleStep[];
}

const defaultSteps: CycleStep[] = [
  { icon: FileText, title: 'اطلاعات و مستندات', note: 'یک‌بار ورود' },
  { icon: Sparkles, title: 'پیشنهاد آماده بررسی', note: 'همراه با دلیل' },
  { icon: Check, title: 'تأیید حسابدار', note: 'اختیار با شما' },
];

function AboutIntroVisual({
  title = 'از ورود دستی،\nبه پیشنهاد و تأیید.',
  note = 'یک رویداد، یک مسیر روشن؛ از مستند اولیه تا دفتر کل.',
  steps = defaultSteps,
}: AboutIntroVisualProps) {
  const [visualLead, visualAccent] = title.split('\n');

  return (
    <div className="relative overflow-hidden rounded-[15px] bg-ink-soft p-[25px] text-sand-soft sm:p-[31px]">
      <h2 className="mb-2 whitespace-pre-line text-2xl leading-[1.8] tracking-[-0.7px] max-[900px]:text-[22px] sm:text-[24px]">
        {visualLead}
        {'\n'}
        {visualAccent}
      </h2>

      <p className="text-[11px] leading-5 text-brand-soft/70">{note}</p>

      <div className="mt-[22px] flex flex-col gap-3 sm:mt-[25px]">
        {steps.map((step, index) => (
          <AboutIntroStep
            isLast={index === steps.length - 1}
            key={step.title}
            step={step}
          />
        ))}
      </div>
    </div>
  );
}

export default AboutIntroVisual;
