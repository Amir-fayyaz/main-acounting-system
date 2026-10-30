import { P, Small, Span } from '@repo/web/ui';
import type { CSSProperties } from 'react';

const breakdown = [
  { label: 'سود خالص', value: '۲۸٪', slice: 'var(--chart-1)' },
  { label: 'هزینه‌های عملیاتی', value: '۵۴٪', slice: 'var(--chart-3)' },
  { label: 'بهای کالا', value: '۱۸٪', slice: 'var(--border)' },
];

export function ReportScene() {
  return (
    <div className="mx-8 mt-6 mb-7 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-7 border-t border-border pt-5 max-xl:mx-6 max-xl:gap-4 max-md:mx-7 max-md:pt-6 max-lg:m-5 max-lg:gap-4">
      <div
        role="img"
        aria-label="نمودار نمونه: ۲۸ درصد سود خالص، ۵۴ درصد هزینه عملیاتی و ۱۸ درصد بهای کالا"
        className="grid size-36 -rotate-90 place-items-center rounded-full bg-[conic-gradient(var(--chart-1)_0_28%,var(--chart-3)_28%_82%,var(--border)_82%_100%)] before:col-start-1 before:row-start-1 before:size-28 before:rounded-full before:bg-card before:content-[''] max-xl:size-32 max-xl:before:size-24 max-md:size-32 max-md:before:size-24 max-lg:size-24 max-lg:before:size-20"
      >
        <div className="col-start-1 row-start-1 rotate-90 text-center text-2xl leading-relaxed font-bold max-lg:text-xl">
          <Span className="text-[length:inherit]">۲۸٪</Span>
          <Small className="block! text-xs! font-normal! text-muted-foreground!">سود خالص</Small>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {breakdown.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3.5 border-b border-sand pb-2 text-xs last-of-type:border-0 last-of-type:pb-0 max-md:pb-2.5 max-lg:gap-1"
          >
            <Span className="flex! items-center! gap-1.5! text-[length:inherit]!">
              <i
                className="size-1.5 rounded-sm bg-(--slice)"
                style={{ '--slice': item.slice } as CSSProperties}
              />
              {item.label}
            </Span>

            <strong className="text-xs font-semibold">
              <Span className="text-[length:inherit]">{item.value}</Span>
            </strong>
          </div>
        ))}

        <P className="mt-0 text-xs text-muted-foreground">ترکیب نمونه فروش خالص · مهر ۱۴۰۵</P>
      </div>
    </div>
  );
}
