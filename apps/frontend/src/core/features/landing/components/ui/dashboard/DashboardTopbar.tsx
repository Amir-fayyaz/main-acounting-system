import type { Dispatch, SetStateAction } from 'react';

import {
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Span,
} from '@repo/web/ui';

import type { DashboardData, DashboardView } from '@/core/features/landing/assets/@types/dashboard';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';

interface DashboardTopbarProps {
  data: DashboardData;
  reportName: string;
  view: DashboardView;
  onViewChange: Dispatch<SetStateAction<DashboardView>>;
}

export function DashboardTopbar({ data, reportName, view, onViewChange }: DashboardTopbarProps) {
  return (
    <div className="flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-5 max-sm:h-11 max-sm:px-3 max-md:px-3.5">
      <div className="flex items-center gap-2.5 text-xs font-semibold max-sm:gap-1.5 max-sm:before:ml-0.5 max-sm:before:border-l max-sm:before:border-border max-sm:before:pl-2.5 max-sm:before:text-base max-sm:before:font-extrabold max-sm:before:content-['تراز']">
        <LandingIcon name="grid" className="size-4 text-muted-foreground max-sm:hidden" />
        <Span className="text-[length:inherit] max-sm:hidden">{reportName}</Span>

        <Select value={view} onValueChange={(value) => onViewChange(value as DashboardView)}>
          <SelectTrigger
            aria-label={data.viewSelectLabel}
            className="hidden! h-auto! w-auto! border-0! bg-transparent! p-0! text-xs! text-foreground! shadow-none! max-sm:flex! max-sm:max-w-32"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="min-w-36">
            {data.views.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                <Span className="text-[length:inherit]">{item.label}</Span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 max-sm:gap-2">
        <Badge className="bg-accent px-1.5 py-0.5 text-xs text-muted-foreground">
          <Span className="text-[length:inherit]">{data.previewBadgeLabel}</Span>
        </Badge>
        <Span className="grid size-7 place-items-center rounded-full bg-border text-xs">
          {data.user.initials}
        </Span>
      </div>
    </div>
  );
}
