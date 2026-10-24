import { cn } from '@repo/web/ui/utils/cn';
import type { LucideIcon } from 'lucide-react';

export interface CycleStep {
  icon: LucideIcon;
  title: string;
  note: string;
}

export interface AboutIntroStepProps {
  step: CycleStep;
  isLast?: boolean;
}

function AboutIntroStep({ step, isLast = false }: AboutIntroStepProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[7px] border px-3 py-3 text-xs max-[900px]:px-[11px] max-[900px]:py-[11px] max-[900px]:text-[11px] sm:px-[15px] sm:py-[13px] sm:text-xs',
        isLast ? 'border-brand bg-brand text-ink' : 'border-sand/20 bg-ink-soft',
      )}
    >
      <step.icon className={cn('size-5', isLast ? 'text-ink-soft' : 'text-brand')} />
      <strong className="font-semibold">{step.title}</strong>
      <small className={cn('ms-auto text-[10px]', isLast ? 'text-ink-soft' : 'text-sand/75')}>
        {step.note}
      </small>
    </div>
  );
}

export default AboutIntroStep;
