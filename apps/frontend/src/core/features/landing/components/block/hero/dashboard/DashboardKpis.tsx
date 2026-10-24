import type {
  DashboardData,
  DashboardPeriod,
  DashboardReport,
} from '@/core/features/landing/assets/@types/dashboard';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { Card, Small, Span } from '@repo/web/ui';

interface DashboardKpisProps {
  data: DashboardData;
  period: DashboardPeriod;
  report: DashboardReport;
}

export function DashboardKpis({ data, period, report }: DashboardKpisProps) {
  const footnotes = period === 'year' ? report.yearFeet : report.feet;

  return (
    <div className="grid grid-cols-3 gap-3 max-[360px]:grid-cols-1 max-[360px]:gap-[7px] max-[600px]:gap-1.5 max-[800px]:gap-2">
      {report.labels.map((label, index) => (
        <Card
          key={label}
          className="gap-0 rounded-[8px] border border-[#e8e4db] bg-white p-[13px_14px] shadow-none max-[360px]:grid max-[360px]:grid-cols-[1fr_auto] max-[360px]:gap-[3px_9px] max-[360px]:p-[10px_11px] max-[600px]:rounded-[6px] max-[600px]:p-[9px_8px] max-[800px]:p-[10px]"
        >
          <div className="flex justify-between gap-2 text-[10px] text-[#746b60] max-[360px]:col-start-1 max-[360px]:row-start-1 max-[360px]:justify-start max-[360px]:gap-[5px] max-[360px]:text-[9px] max-[600px]:gap-[2px] max-[600px]:text-[8px]">
            <Span className="!text-[10px] max-[360px]:!text-[9px] max-[600px]:!text-[8px]">
              {label}
            </Span>
            <LandingIcon
              name={data.kpiIcons[index]}
              className="h-[15px] w-[15px] text-[#b1823d] max-[600px]:size-3"
            />
          </div>

          <div className="my-1.5 mb-1 text-[20px] font-[750] tracking-[-0.3px] max-[360px]:col-start-2 max-[360px]:row-[1/3] max-[360px]:my-0 max-[360px]:self-center max-[360px]:whitespace-nowrap max-[360px]:text-[16px] max-[600px]:my-[5px_3px] max-[600px]:text-[16px] max-[600px]:leading-[1.7] max-[800px]:text-[17px]">
            <Span>{report[period][index]}</Span>
            <Small className="mr-[3px] text-[10px] font-normal text-[#746b60] max-[360px]:mr-[3px] max-[360px]:inline max-[360px]:text-[8px] max-[600px]:m-0 max-[600px]:block max-[600px]:text-[8px] max-[800px]:text-[9px]">
              {data.kpiUnit}
            </Small>
          </div>

          <div className="text-[9px] text-[#716c5d] max-[360px]:col-start-1 max-[360px]:row-start-2 max-[360px]:max-w-[125px] max-[360px]:text-[8px] max-[600px]:text-[7px] max-[600px]:leading-[1.8] max-[800px]:text-[8px]">
            <Span className="!text-[10px] max-[360px]:!text-[9px] max-[600px]:!text-[8px]">
              {footnotes[index]}
            </Span>
          </div>
        </Card>
      ))}
    </div>
  );
}
