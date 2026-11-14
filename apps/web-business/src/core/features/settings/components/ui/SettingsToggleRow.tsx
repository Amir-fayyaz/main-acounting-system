'use client';

import { Check } from 'lucide-react';
import { P, Small } from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

export type SettingsToggleRowProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  locked?: boolean;
};

export function SettingsToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  locked = false,
}: SettingsToggleRowProps) {
  const isDisabled = disabled || locked;

  function handleToggle() {
    if (isDisabled) return;
    onCheckedChange(!checked);
  }

  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <label htmlFor={id} className={cn('space-y-1 select-none', isDisabled ? 'cursor-default' : 'cursor-pointer')}>
        <Small className="block text-sm font-bold text-foreground">{label}</Small>
        <P className="text-xs leading-5 text-muted-foreground">{description}</P>
      </label>

      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        disabled={isDisabled}
        onClick={handleToggle}
        className={cn(
          'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          checked && locked
            ? 'border-transparent bg-muted-foreground/50 text-background cursor-not-allowed'
            : checked
              ? 'border-transparent bg-[#FF9800] text-stone-950'
              : 'border-muted-foreground/60 bg-transparent text-transparent',
          !isDisabled && 'cursor-pointer',
          isDisabled && !locked && 'opacity-60 cursor-not-allowed',
        )}
      >
        <Check className="size-3.5 stroke-[3]" aria-hidden="true" />
      </button>
    </div>
  );
}
