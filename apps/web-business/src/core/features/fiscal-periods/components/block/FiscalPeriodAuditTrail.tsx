import { Card, H2, Muted, Span } from '@repo/web/ui';

import type { FiscalAuditLog } from '../../assets/@types/fiscal-periods.types';

interface FiscalPeriodAuditTrailProps {
  logs: FiscalAuditLog[];
}

export function FiscalPeriodAuditTrail({ logs }: FiscalPeriodAuditTrailProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-4 sm:px-5">
        <H2 className="pb-0 text-start text-sm font-bold sm:text-base">
          تاریخچه‌ی قفل و بازگشایی دوره‌ها
        </H2>
        <Muted className="text-sm sm:text-xs">همه‌ی تغییرها در ممیزی ثبت می‌شود</Muted>
      </header>

      {logs.length === 0 ? (
        <Muted className="px-5 py-6 text-center text-xs">
          هنوز تغییری در دوره‌ها ثبت نشده است.
        </Muted>
      ) : (
        <ul className="divide-y divide-border">
          {logs.map((log) => (
            <li key={log.id} className="space-y-1 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <Muted className="text-xs text-foreground sm:text-sm">
                  <Span className="text-xs font-semibold sm:text-sm">{log.action}</Span>
                  <Span className="text-xs text-muted-foreground sm:text-sm">
                    {' '}
                    · {log.periodName}
                  </Span>
                </Muted>
                <Span className="text-sm tabular-nums text-muted-foreground sm:text-xs">
                  {log.at}
                </Span>
              </div>
              <Span className="text-sm leading-5 text-muted-foreground sm:text-xs">
                {log.actor}
                {log.reason ? ` · دلیل: ${log.reason}` : ''}
              </Span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
