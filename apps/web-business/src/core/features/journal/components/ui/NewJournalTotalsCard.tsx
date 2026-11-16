import { Card, CardContent } from '@repo/web';
import { formatMoneyAmount } from '../../utils/journal-formatters';

export interface NewJournalTotalsCardProps {
  isBalanced: boolean;
  description: string;
  totalDebit: bigint;
  totalCredit: bigint;
  diff: bigint;
}

export function NewJournalTotalsCard({
  isBalanced,
  description,
  totalDebit,
  totalCredit,
  diff,
}: NewJournalTotalsCardProps) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-6">
        {/* Status Message */}
        <div
          data-testid="journal-balance-message"
          className="p-4 rounded-md border border-border text-sm"
        >
          {isBalanced ? (
            description.trim() ? (
              <div className="text-success font-medium">✓ سند تراز است و آماده ثبت می‌باشد.</div>
            ) : (
              <div className="text-primary font-medium">سند تراز است. شرح سند را وارد کنید.</div>
            )
          ) : totalDebit === BigInt(0) && totalCredit === BigInt(0) ? (
            <div className="text-muted-foreground">
              مبلغ بدهکار و بستانکار را در ردیف‌ها وارد کنید.
            </div>
          ) : (
            <div className="text-destructive font-medium">سند تراز نیست؛ اختلاف را اصلاح کنید.</div>
          )}
        </div>

        {/* Totals Summary */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>جمع بدهکار:</span>
            <span className="tabular-nums font-semibold text-foreground">
              {formatMoneyAmount(totalDebit.toString())} ریال
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>جمع بستانکار:</span>
            <span className="tabular-nums font-semibold text-foreground">
              {formatMoneyAmount(totalCredit.toString())} ریال
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-base">
            <span>اختلاف:</span>
            <span
              data-testid="journal-difference"
              className={`tabular-nums ${diff === BigInt(0) ? 'text-success' : 'text-destructive'}`}
            >
              {formatMoneyAmount(diff.toString())} ریال
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
