'use client';

import {
  SearchInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web/ui';

import type { ChequeDirection, ChequeStatus } from '../../assets/@types/cheque.types';
import { CHEQUE_DIRECTION_OPTIONS, CHEQUE_STATUS_OPTIONS } from '../../lib/checks.config';

export type ChequeStatusFilter = ChequeStatus | 'all';
export type ChequeDirectionFilter = ChequeDirection | 'all';

interface ChecksToolbarProps {
  status: ChequeStatusFilter;
  direction: ChequeDirectionFilter;
  onStatusChange: (value: ChequeStatusFilter) => void;
  onDirectionChange: (value: ChequeDirectionFilter) => void;
}

export function ChecksToolbar({
  status,
  direction,
  onStatusChange,
  onDirectionChange,
}: ChecksToolbarProps) {
  return (
    <div
      data-checks-toolbar
      className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center print:hidden"
    >
      <div className="w-full sm:max-w-xs">
        <SearchInput title="جستجو در جدول…" />
      </div>

      <Select
        value={status}
        onValueChange={(value) => {
          onStatusChange(value as ChequeStatusFilter);
        }}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="وضعیت">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه وضعیت‌ها</SelectItem>
          {CHEQUE_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={direction}
        onValueChange={(value) => {
          onDirectionChange(value as ChequeDirectionFilter);
        }}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="نوع چک">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">همه انواع</SelectItem>
          {CHEQUE_DIRECTION_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
