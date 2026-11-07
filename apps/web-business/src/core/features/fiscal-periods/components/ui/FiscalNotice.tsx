import type { ReactNode } from 'react';
import { cn } from '@repo/web/ui/utils/cn';

type FiscalNoticeTone = 'info' | 'warning' | 'danger';

interface FiscalNoticeProps {
  tone?: FiscalNoticeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FiscalNotice({ tone = 'info', icon, children, className }: FiscalNoticeProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3.5 py-3 text-xs leading-6 sm:text-sm',
        tone === 'info' && 'border-border bg-muted text-foreground',
        tone === 'warning' && 'border-brand/40 bg-accent text-accent-foreground',
        tone === 'danger' && 'border-destructive/40 bg-destructive/10 text-destructive',
        className,
      )}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
