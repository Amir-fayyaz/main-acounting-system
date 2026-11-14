import { CiCalendarDate } from 'react-icons/ci';
import type { FiscalYear } from '../../assets/@types';
import { toFaDigits } from '../../utils/fiscal-date';

export interface FiscalYearToolbarProps {
  years: FiscalYear[];
  selectedYearId: string;
  selectedYear: FiscalYear | null;
  onSelectYear: (yearId: string) => void;
}

export function FiscalYearToolbar({
  years,
  selectedYearId,
  selectedYear,
  onSelectYear,
}: FiscalYearToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-md border border-border bg-card">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">سال مالی:</span>
        <select
          aria-label="انتخاب سال مالی"
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          value={selectedYearId}
          onChange={(e) => onSelectYear(e.target.value)}
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.title}
            </option>
          ))}
        </select>
      </div>

      {selectedYear && (
        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
          <CiCalendarDate className="size-4" />
          <span>
            از تاریخ {toFaDigits(selectedYear.from)} تا {toFaDigits(selectedYear.to)}
          </span>
        </div>
      )}
    </div>
  );
}
