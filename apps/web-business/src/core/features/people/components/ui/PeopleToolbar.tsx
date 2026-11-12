'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

const ALL_KIND = '__all__';

const KIND_OPTIONS = ['مشتری', 'تأمین‌کننده', 'هر دو'] as const;

export type PeopleToolbarProps = {
  kind: string;
  onKindChange: (value: string) => void;
  className?: string;
};

export function PeopleToolbar({ kind, onKindChange, className }: PeopleToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <Select
        value={kind || ALL_KIND}
        onValueChange={(next) => onKindChange(next === ALL_KIND ? '' : next)}
      >
        <SelectTrigger aria-label="نوع شخص" className="w-40">
          <SelectValue placeholder="نوع" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_KIND}>نوع: همه</SelectItem>
          {KIND_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
