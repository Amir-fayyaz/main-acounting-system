'use client';

import {
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web/ui';

import type { PosStatus } from '../../assets/@types/pos-terminal.types';
import { POS_STATUS_OPTIONS } from '../../lib/pos.config';

export type PosStatusFilter = PosStatus | 'all';

interface PosToolbarProps {
  status: PosStatusFilter;
  onStatusChange: (value: PosStatusFilter) => void;
}

export function PosToolbar({ status, onStatusChange }: PosToolbarProps) {
  return (
    <div
      data-pos-toolbar
      className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center print:hidden"
    >
      <div className="w-full sm:max-w-xs">
        <SearchInput title="جستجو در جدول…" />
      </div>

      <Select
        value={status}
        onValueChange={(value) => {
          onStatusChange(value as PosStatusFilter);
        }}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="وضعیت">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه وضعیت‌ها</SelectItem>
          {POS_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
