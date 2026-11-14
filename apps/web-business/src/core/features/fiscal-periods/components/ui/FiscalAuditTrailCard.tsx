import { Card, CardContent, CardHeader, CardTitle } from '@repo/web';
import type { FiscalAuditLog } from '../../assets/@types';
import { toFaDigits } from '../../utils/fiscal-date';

export interface FiscalAuditTrailCardProps {
  auditLogs: FiscalAuditLog[];
}

export function FiscalAuditTrailCard({ auditLogs }: FiscalAuditTrailCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">تاریخچه‌ی قفل و بازگشایی دوره‌ها</CardTitle>
        <p className="text-xs text-muted-foreground">همه‌ی تغییرها در ممیزی ثبت می‌شود</p>
      </CardHeader>
      <CardContent>
        {auditLogs.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">هنوز تغییری ثبت نشده است.</div>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {auditLogs.map((log) => (
              <li key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-foreground">
                    {log.action} · {log.period}
                  </span>
                  {log.reason && (
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      دلیل: {log.reason}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {log.who} · {toFaDigits(log.at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
