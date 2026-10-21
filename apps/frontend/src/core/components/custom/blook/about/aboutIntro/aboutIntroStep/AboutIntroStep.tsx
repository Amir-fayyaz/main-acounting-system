import TarazIcon from '@/core/components/custom/ui/icons/TarazIcon';
import type { TarazIconName } from '@/core/components/custom/ui/icons/TarazIcon';
import { cn } from '@/core/utils/shadcn/utils';

export interface CycleStep {
  icon: TarazIconName;
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
        'flex items-center gap-3 rounded-[7px] border px-3 py-3 text-xs max-taraz-xl:px-[11px] max-taraz-xl:py-[11px] max-taraz-xl:text-[11px] sm:px-[15px] sm:py-[13px] sm:text-xs',
        isLast ? 'border-brand bg-brand text-ink' : 'border-cycle-line bg-cycle-card',
      )}
    >
      <TarazIcon
        className={cn('size-5', isLast ? 'text-cycle-accent' : 'text-brand')}
        name={step.icon}
      />
      <strong className="font-semibold">{step.title}</strong>
      <small
        className={cn('ms-auto text-[10px]', isLast ? 'text-cycle-accent' : 'text-cycle-note')}
      >
        {step.note}
      </small>
    </div>
  );
}

export default AboutIntroStep;
