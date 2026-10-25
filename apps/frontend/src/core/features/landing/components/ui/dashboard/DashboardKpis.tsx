import { Card, Small, Span } from '@repo/web/ui';

import type {
  DashboardData,
  DashboardPeriod,
  DashboardReport,
} from '@/core/features/landing/assets/@types/dashboard';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';

interface DashboardKpisProps {
  data: DashboardData;
  period: DashboardPeriod;
  report: DashboardReport;
}

export function DashboardKpis({ data, period, report }: DashboardKpisProps) {
  const footnotes = period === 'year' ? report.yearFeet : report.feet;

  return (
    <div className="grid grid-cols-3 gap-3 max-sm:gap-1.5 max-md:gap-2">
      {report.labels.map((label, index) => (
        <Card
          key={label}
          className="gap-0 rounded-lg border border-[#e8e4db] bg-white py-3 px-3.5 shadow-none max-sm:rounded-md max-sm:py-2 max-sm:px-2 max-md:p-2.5"
        >
          <div className="flex justify-between gap-2 text-xs text-[#746b60] max-sm:gap-0.5">
            <Span className="text-xs!">{label}</Span>
            <LandingIcon
              name={data.kpiIcons[index]}
              className="h-3.5 w-3.5 text-[#b1823d] max-sm:size-3"
            />
          </div>

          <div className="my-1.5 mb-1 text-xl font-bold tracking-tight max-sm:my-1 max-sm:mb-0.5 max-sm:text-base max-sm:leading-relaxed max-md:text-base">
            <Span className="text-[length:inherit]">{report[period][index]}</Span>
            <Small className="mr-0.5 text-xs font-normal text-[#746b60] max-sm:m-0 max-sm:block">
              {data.kpiUnit}
            </Small>
          </div>

          <div className="text-xs text-[#716c5d] max-sm:leading-relaxed">
            <Span className="text-xs!">{footnotes[index]}</Span>
          </div>
        </Card>
      ))}
    </div>
  );
}
