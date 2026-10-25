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
    <Card className="gap-0 rounded-lg border border-[#e8e4db] bg-white p-3.5 shadow-none max-sm:p-2.5 max-md:p-2.5">
      <div className="flex justify-between gap-1.5 text-xs font-semibold">
        <Span className="text-xs! font-semibold!">{report.chart}</Span>
        <Small className="text-xs! font-normal! text-[#746b60]">{data.chartUnits[period]}</Small>
      </div>

      <div className="mt-3 flex gap-3 text-xs text-[#746b60] max-sm:mt-1.5">
        {report.legend.map((item, index) => (
          <Span key={item} className="flex! items-center gap-1 text-xs!">
            <i
              aria-hidden="true"
              className={cn(
                'block size-1.5 rounded-sm bg-[#ffa00a]',
                index === 1 && 'bg-[#e8e4d8]',
              )}
            />
            <Span className="text-xs!">{item}</Span>
          </Span>
        ))}
      </div>

      <div
        role="img"
        aria-label={`${data.chartAriaLabelPrefix} ${report.chart}، ${
          annual ? 'نیمه نخست سال' : 'شش ماه اخیر'
        }`}
        className="relative mt-1.5 flex h-32 items-end justify-around gap-1 sm:gap-3 border-b border-[#ece8dd] px-1 sm:px-2 pt-2.5 [background:repeating-linear-gradient(to_top,transparent_0,transparent_36px,#f0ede6_37px,transparent_38px)] [direction:rtl] sm:h-36 md:gap-2.5 md:px-1.5 lg:h-44 lg:gap-3.5 lg:px-2 max-sm:h-24 max-sm:pt-1.5"
      >
        {Array.from({ length: 6 }, (_, group) => (
          <div
            key={group}
            className="flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 sm:gap-1"
          >
            <ChartBar height={barHeight(report.bars, group * 2, period)} tone="primary" />
            <ChartBar height={barHeight(report.bars, group * 2 + 1, period)} tone="muted" />
          </div>
        ))}
      </div>

      <div className="flex justify-around pt-1 text-xs text-[#746b60]">
        {labels.map((label) => (
          <Span key={label} className="text-xs!">
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
        'h-(--height) w-4 max-w-[32%] rounded-t-sm transition-[height] duration-500 max-md:w-3.5 max-sm:w-3',
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
