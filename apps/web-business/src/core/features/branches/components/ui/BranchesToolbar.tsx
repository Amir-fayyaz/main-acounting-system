'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

import { BRANCH_STATUS_OPTIONS } from './BranchStatusBadge';

/** Radix Select rejects an empty item value, so "all" uses a sentinel. */
const ALL_STATUS = '__all__';

export type BranchesToolbarProps = {
  /** Current URL status; an empty string means "all". */
  value: string;
  /** Receives the selected status, or `''` when the filter is cleared. */
  onChange: (value: string) => void;
  className?: string;
};

/**
 * Search + status filter for the branches list.
 *
 * Search now lives in the shared DataTable toolbar; the status control is
 * fully controlled through props so the page owns URL state.
 */
export function BranchesToolbar({ value, onChange, className }: BranchesToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <Select
        value={value || ALL_STATUS}
        onValueChange={(next) => onChange(next === ALL_STATUS ? '' : next)}
      >
        <SelectTrigger aria-label="وضعیت شعبه" className="w-40">
          <SelectValue placeholder="وضعیت" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUS}>وضعیت: همه</SelectItem>
          {BRANCH_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
