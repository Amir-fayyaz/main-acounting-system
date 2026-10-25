import type { Dispatch, SetStateAction } from 'react';

import { Span } from '@/core/components/custom/ui/typography/Typography';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/core/components/shadcn/ui/select/select';
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
    <div className="flex h-[58px] items-center justify-between gap-3 border-b border-[#eae7df] bg-white px-[22px] max-[600px]:h-[43px] max-[600px]:px-[13px] max-[800px]:px-[15px]">
      <div className="flex items-center gap-[10px] text-[12px] font-[650] max-[600px]:gap-[7px] max-[600px]:text-[10px] max-[600px]:before:ml-[3px] max-[600px]:before:border-l max-[600px]:before:border-[#ddd3c1] max-[600px]:before:pl-[10px] max-[600px]:before:text-[17px] max-[600px]:before:font-[850] max-[600px]:before:content-['تراز']">
        <LandingIcon name="grid" className="size-[17px] text-[#8a7e6c] max-[600px]:hidden" />
        <Span className="max-[600px]:hidden">{reportName}</Span>

        <Select value={view} onValueChange={(value) => onViewChange(value as DashboardView)}>
          <SelectTrigger
            aria-label={data.viewSelectLabel}
            className="!hidden !h-auto !w-auto !border-0 !bg-transparent !p-0 !text-[10px] !text-[#1a120a] !shadow-none max-[600px]:!flex max-[600px]:max-w-[125px] max-[360px]:max-w-[105px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[145px]">
            {data.views.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 max-[600px]:gap-[9px]">
        <Badge className="bg-[#fff1d9] px-1.5 py-0.5 text-[10px] text-[#875100] max-[600px]:text-[9px]">
          {data.previewBadgeLabel}
        </Badge>
        <Span className="grid size-[27px] place-items-center rounded-full bg-[#e7e5d6] text-[10px] max-[360px]:hidden">
          {data.user.initials}
        </Span>
      </div>
    </div>
  );
}
