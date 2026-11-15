'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

import { AUDIT_OUTCOME_OPTIONS } from './AuditOutcomeBadge';

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
          {AUDIT_OUTCOME_OPTIONS.map((outcome) => (
            <SelectItem key={outcome} value={outcome}>
              {outcome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
