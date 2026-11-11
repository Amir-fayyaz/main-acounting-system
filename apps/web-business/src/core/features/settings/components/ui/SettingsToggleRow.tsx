'use client';

import { P, Small, Switch } from '@repo/web';

export type SettingsToggleRowProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

export function SettingsToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: SettingsToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0">
      <div className="space-y-1">
        <Small className="font-medium">{label}</Small>
        <P className="text-xs text-muted-foreground">{description}</P>
      </div>

      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      />
    </div>
  );
}
