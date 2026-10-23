import type { CSSProperties } from 'react';

import { Small, Span } from '@/core/components/custom/ui/typography/Typography';
import { Card } from '@/core/components/shadcn/ui/card/card';
import type {
  DashboardData,
  DashboardPeriod,
  DashboardReport,
} from '@/core/features/landing/assets/@types/dashboard';
import { cn } from '@/core/utils/shadcn/utils';

interface DashboardChartProps {
  data: DashboardData;
  period: DashboardPeriod;
  report: DashboardReport;
}

export function DashboardChart({ data, period, report }: DashboardChartProps) {
  const annual = period === 'year';
  const labels = annual ? data.labelsYear : data.labelsMonth;

  return (
    <Card className="gap-0 rounded-[8px] border border-[#e8e4db] bg-white p-[14px] shadow-none max-[600px]:p-[11px] max-[800px]:p-[11px]">
      <div className="flex justify-between gap-[7px] text-[11px] font-[650] max-[600px]:text-[10px]">
        <Span className="!text-[11px] !font-[650] max-[600px]:!text-[10px]">{report.chart}</Span>
        <Small className="!text-[9px] !font-normal text-[#746b60] max-[600px]:!text-[8px]">
          {data.chartUnits[period]}
        </Small>
      </div>

      <div className="mt-3 flex gap-3 text-[9px] text-[#746b60] max-[600px]:mt-[7px] max-[600px]:text-[8px]">
        {report.legend.map((item, index) => (
          <Span key={item} className="!flex items-center gap-1 !text-[9px] max-[600px]:!text-[8px]">
            <i
              aria-hidden="true"
              className={cn(
                'block size-1.5 rounded-[2px] bg-[#ffa00a]',
                index === 1 && 'bg-[#e8e4d8]',
              )}
            />
            <Span className="!text-[9px] max-[600px]:!text-[8px]">{item}</Span>
          </Span>
        ))}
      </div>

      <div
        role="img"
        aria-label={`${data.chartAriaLabelPrefix} ${report.chart}، ${
          annual ? 'نیمه نخست سال' : 'شش ماه اخیر'
        }`}
        className="relative mt-[7px] flex h-[130px] items-end justify-around gap-[clamp(4px,1.5vw,15px)] border-b border-[#ece8dd] px-[clamp(3px,1vw,9px)] pt-[10px] [background:repeating-linear-gradient(to_top,transparent_0,transparent_36px,#f0ede6_37px,transparent_38px)] [direction:rtl] sm:h-[150px] md:gap-[10px] md:px-[6px] lg:h-[170px] lg:gap-[15px] lg:px-[9px] max-[600px]:h-[100px] max-[600px]:pt-[7px] max-[400px]:h-[85px] max-[400px]:gap-[3px] max-[400px]:px-[2px]"
      >
        {Array.from({ length: 6 }, (_, group) => (
          <div
            key={group}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-[clamp(2px,0.5vw,5px)]"
          >
            <ChartBar height={barHeight(report.bars, group * 2, period)} tone="primary" />
            <ChartBar height={barHeight(report.bars, group * 2 + 1, period)} tone="muted" />
          </div>
        ))}
      </div>

      <div className="flex justify-around pt-[5px] text-[9px] text-[#746b60] max-[600px]:text-[8px]">
        {labels.map((label) => (
          <Span key={label} className="!text-[9px] max-[600px]:!text-[8px]">
            {label}
          </Span>
        ))}
      </div>
    </Card>
  );
}

function ChartBar({ height, tone }: { height: string; tone: 'primary' | 'muted' }) {
  return (
    <i
      aria-hidden="true"
      className={cn(
        'h-[var(--height)] w-[18px] max-w-[32%] rounded-t-[3px] transition-[height] duration-500 max-[800px]:w-[14px] max-[600px]:w-[12px] max-[400px]:w-[9px]',
        tone === 'primary' ? 'bg-[#ffa00a]' : 'bg-[#e8e4d8]',
      )}
      style={{ '--height': height } as CSSProperties}
    />
  );
}

function barHeight(bars: number[], index: number, period: DashboardPeriod) {
  if (period === 'year') {
    return `${Math.max(18, bars[index] - 8 + (index % 3) * 7)}%`;
  }

  return `${bars[index]}%`;
}
