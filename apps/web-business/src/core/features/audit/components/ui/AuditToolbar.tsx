'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

const ALL = '__all__';

export type AuditToolbarProps = {
  outcome: string;
  onOutcomeChange: (value: string) => void;
  className?: string;
};

export function AuditToolbar({ outcome, onOutcomeChange, className }: AuditToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <Select value={outcome || ALL} onValueChange={(n) => onOutcomeChange(n === ALL ? '' : n)}>
        <SelectTrigger aria-label="نتیجه" className="w-36">
          <SelectValue placeholder="نتیجه" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>نتیجه: همه</SelectItem>
          <SelectItem value="موفق">موفق</SelectItem>
          <SelectItem value="ناموفق">ناموفق</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
