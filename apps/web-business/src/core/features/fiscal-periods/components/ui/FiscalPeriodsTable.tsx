import { CiRedo } from 'react-icons/ci';
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@repo/web';
import type { FiscalPeriod } from '../../assets/@types';
import { toFaDigits } from '../../utils/fiscal-date';
import { PeriodStatusBadge } from './PeriodStatusBadge';

export interface FiscalPeriodsTableProps {
  loading: boolean;
  periods: FiscalPeriod[];
  onGeneratePeriods: () => void;
  onOpenNewPeriod: () => void;
  onStartReview: (period: FiscalPeriod) => void;
  onRevertToOpen: (period: FiscalPeriod) => void;
  onSelectClosePeriod: (period: FiscalPeriod) => void;
  onSelectReopenPeriod: (period: FiscalPeriod) => void;
}

export function FiscalPeriodsTable({
  loading,
  periods,
  onGeneratePeriods,
  onOpenNewPeriod,
  onStartReview,
  onRevertToOpen,
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
              <TableCell colSpan={5} className="py-8 text-center">
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">این سال مالی هنوز دوره‌ای ندارد.</p>
                  <div className="flex justify-center gap-2">
                    <Button size="sm" onClick={onGeneratePeriods}>
                      <CiRedo className="size-3.5 me-1.5" />
                      تولید ۱۲ دوره‌ی ماهانه
                    </Button>
                    <Button variant="outline" size="sm" onClick={onOpenNewPeriod}>
                      ایجاد دوره
                    </Button>
                  </div>
                </div>
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
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onStartReview(period)}
                        >
                          شروع بازبینی
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => onSelectClosePeriod(period)}
                        >
                          بستن دوره
                        </Button>
                      </>
                    )}

                    {period.status === 'review' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => onRevertToOpen(period)}
                        >
                          بازگشت به باز
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => onSelectClosePeriod(period)}
                        >
                          بستن دوره
                        </Button>
                      </>
                    )}

                    {period.status === 'closing' && (
                      <span className="text-xs text-muted-foreground">در حال پردازش…</span>
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

                    {period.status === 'reopened' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => onSelectClosePeriod(period)}
                      >
                        بستن دوباره
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
