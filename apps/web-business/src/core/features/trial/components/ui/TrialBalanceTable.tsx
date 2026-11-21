import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import type { TrialBalanceRow, TrialBalanceSummary } from '../../assets/@types';

export interface TrialBalanceTableProps {
  loading: boolean;
  error: string | null;
  rows: TrialBalanceRow[];
  summary: TrialBalanceSummary;
  search: string;
  toFaDigits: (val: string | number) => string;
  formatMoney: (amount: string) => string;
}

export function TrialBalanceTable({
  loading,
  error,
  rows,
  summary,
  search,
  toFaDigits,
  formatMoney,
}: TrialBalanceTableProps) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table aria-label="تراز آزمایشی">
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">کد</TableHead>
            <TableHead>نام حساب</TableHead>
            <TableHead className="text-end">مانده بدهکار (ریال)</TableHead>
            <TableHead className="text-end">مانده بستانکار (ریال)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                در حال بارگذاری اطلاعات…
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-destructive">
                {error}
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                {search ? `حسابی مطابق «${search}» پیدا نشد.` : 'حسابی ثبت نشده است.'}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-sm">{toFaDigits(row.code)}</TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-end tabular-nums">
                  {row.debit === '0.00' ? '—' : formatMoney(row.debit)}
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {row.credit === '0.00' ? '—' : formatMoney(row.credit)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {!loading && !error && rows.length > 0 && (
          <TableFooter>
            <TableRow className="font-bold bg-muted/50">
              <TableCell colSpan={2}>جمع کل</TableCell>
              <TableCell className="text-end tabular-nums">
                {formatMoney(summary.totalDebit)}
              </TableCell>
              <TableCell className="text-end tabular-nums">
                {formatMoney(summary.totalCredit)}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
