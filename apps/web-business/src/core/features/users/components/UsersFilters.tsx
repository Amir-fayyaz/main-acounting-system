'use client';

import { Input } from '@repo/web/ui/components/shadcn/ui/input/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web/ui/components/shadcn/ui/select/select';
import { Search, Filter } from 'lucide-react';
import type { UserRole, UserStatus } from '../assets/@types/user';

interface UsersFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: UserRole | 'all';
  onRoleFilterChange: (value: UserRole | 'all') => void;
  statusFilter: UserStatus | 'all';
  onStatusFilterChange: (value: UserStatus | 'all') => void;
}

const ROLE_OPTIONS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: 'همه نقش‌ها' },
  { value: 'admin', label: 'مدیر سیستم' },
  { value: 'manager', label: 'مدیر' },
  { value: 'employee', label: 'کارمند' },
  { value: 'viewer', label: 'مشاهده‌گر' },
];

const STATUS_OPTIONS: { value: UserStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'active', label: 'فعال' },
  { value: 'inactive', label: 'غیرفعال' },
  { value: 'pending', label: 'در انتظار تایید' },
  { value: 'suspended', label: 'موقوف' },
];

export function UsersFilters({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
}: UsersFiltersProps) {
  return (
    <div className="space-y-4" data-slot="users-filters">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            placeholder="جستجو در کاربران..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9 pr-10"
            aria-label="جستجو در کاربران"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Filter className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Select
              value={roleFilter}
              onValueChange={(value) => onRoleFilterChange(value as UserRole | 'all')}
            >
              <SelectTrigger
                aria-label="فیلتر بر اساس نقش"
                className="w-40 [&>span]:line-clamp-1"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Filter className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <Select
              value={statusFilter}
              onValueChange={(value) => onStatusFilterChange(value as UserStatus | 'all')}
            >
              <SelectTrigger
                aria-label="فیلتر بر اساس وضعیت"
                className="w-40 [&>span]:line-clamp-1"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
