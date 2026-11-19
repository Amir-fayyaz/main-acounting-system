import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/web';
import type { FiscalPeriod } from '../../assets/@types';
import { toFaDigits } from '../../utils/fiscal-date';
import { PeriodStatusBadge } from './PeriodStatusBadge';

export interface FiscalPeriodsTableProps {
  loading: boolean;
  periods: FiscalPeriod[];
  onSelectClosePeriod: (period: FiscalPeriod) => void;
  onSelectReopenPeriod: (period: FiscalPeriod) => void;
}

export function FiscalPeriodsTable({
  loading,
  periods,
  onSelectClosePeriod,
  onSelectReopenPeriod,
}: FiscalPeriodsTableProps) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <Table aria-label="دوره‌های مالی">
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/4">دوره</TableHead>
            <TableHead className="w-1/5">از تاریخ</TableHead>
            <TableHead className="w-1/5">تا تاریخ</TableHead>
            <TableHead className="w-1/6">وضعیت</TableHead>
            <TableHead className="text-end">عملیات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                در حال بارگذاری دوره‌های مالی…
              </TableCell>
            </TableRow>
          ) : periods.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                این سال مالی هنوز دوره‌ای ندارد.
              </TableCell>
            </TableRow>
          ) : (
            periods.map((period) => (
              <TableRow key={period.id}>
                <TableCell className="font-medium">{period.name}</TableCell>
                <TableCell className="tabular-nums font-mono text-sm">
                  {toFaDigits(period.from)}
                </TableCell>
                <TableCell className="tabular-nums font-mono text-sm">
                  {toFaDigits(period.to)}
                </TableCell>
                <TableCell>
                  <PeriodStatusBadge status={period.status} />
                </TableCell>
                <TableCell className="text-end">
                  <div className="flex items-center justify-end gap-1.5">
                    {period.status === 'open' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => onSelectClosePeriod(period)}
                      >
                        بستن دوره
                      </Button>
                    )}

                    {period.status === 'closed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-primary hover:bg-primary/10"
                        onClick={() => onSelectReopenPeriod(period)}
                      >
                        بازگشایی
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
