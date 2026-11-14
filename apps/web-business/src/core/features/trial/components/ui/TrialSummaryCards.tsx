import { CiCircleAlert, CiCircleCheck } from 'react-icons/ci';
import { Card, CardContent } from '@repo/web';
import type { TrialBalanceSummary } from '../../assets/@types';

export interface TrialSummaryCardsProps {
  summary: TrialBalanceSummary;
  formatMoney: (amount: string) => string;
}

export function TrialSummaryCards({ summary, formatMoney }: TrialSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">جمع مانده بدهکار</div>
          <div className="text-xl font-bold tabular-nums mt-1 text-foreground">
            {formatMoney(summary.totalDebit)} <span className="text-xs font-normal">ریال</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">جمع مانده بستانکار</div>
          <div className="text-xl font-bold tabular-nums mt-1 text-foreground">
            {formatMoney(summary.totalCredit)} <span className="text-xs font-normal">ریال</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">وضعیت تراز</div>
          <div className="flex items-center gap-1.5 mt-1">
            {summary.isBalanced ? (
              <>
                <CiCircleCheck className="size-5 text-success" />
                <span className="text-base font-semibold text-success">تراز است</span>
              </>
            ) : (
              <>
                <CiCircleAlert className="size-5 text-destructive" />
                <span className="text-base font-semibold text-destructive">
                  عدم تراز (اختلاف: {formatMoney(summary.difference)} ریال)
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
