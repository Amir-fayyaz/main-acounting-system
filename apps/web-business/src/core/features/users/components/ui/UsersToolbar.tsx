'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

/** Radix Select rejects an empty item value, so "all" uses a sentinel. */
const ALL_ROLE = '__all__';

export const USER_ROLE_OPTIONS = [
  'مدیر مالی',
  'حسابدار ارشد',
  'صندوقدار',
  'حسابدار',
  'مدیر شعبه',
  'ناظر (فقط مشاهده)',
] as const;

export type UsersToolbarProps = {
  /** Current URL role; an empty string means "all". */
  value: string;
  /** Receives the selected role, or `''` when the filter is cleared. */
  onChange: (value: string) => void;
  className?: string;
};

/** Role filter for the users list. Search lives in the shared DataTable toolbar. */
export function UsersToolbar({ value, onChange, className }: UsersToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <Select
        value={value || ALL_ROLE}
        onValueChange={(next) => onChange(next === ALL_ROLE ? '' : next)}
      >
        <SelectTrigger aria-label="نقش کاربر" className="w-48">
          <SelectValue placeholder="نقش" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_ROLE}>نقش: همه</SelectItem>
          {USER_ROLE_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
