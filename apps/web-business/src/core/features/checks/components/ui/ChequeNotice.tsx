import type { ReactNode } from 'react';

import { cn } from '@repo/web/ui/utils/cn';

type ChequeNoticeTone = 'info' | 'warning' | 'danger';

const TONE_CLASSES: Record<ChequeNoticeTone, string> = {
  info: 'border-border bg-muted text-foreground',
  warning: 'border-primary/40 bg-accent text-accent-foreground',
  danger: 'border-destructive/40 bg-destructive/10 text-destructive',
};

interface ChequeNoticeProps {
  tone?: ChequeNoticeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChequeNotice({ tone = 'info', icon, children, className }: ChequeNoticeProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3.5 py-3 text-xs leading-6 sm:text-sm',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
