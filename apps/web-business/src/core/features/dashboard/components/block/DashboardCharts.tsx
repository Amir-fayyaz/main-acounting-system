import { Card, CardContent, CardHeader } from '@repo/web/ui';

import type { CashflowMonth, PaymentMethodShare } from '../../assets/@types';
import { toFaDigits } from '../../../panel/utils/persian-digits';

const INCOME_COLOR = 'var(--chart-1)';
const EXPENSE_COLOR = 'var(--muted-foreground)';

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  cash: 'var(--chart-1)',
  card: 'var(--success)',
  cheque: 'var(--chart-3)',
  transfer: 'var(--chart-4)',
};

const CARD_TITLE_CLASS = 'text-[15px] font-bold';

function toBillions(money: string): number {
  return Number(BigInt(money.split('.')[0])) / 1e9;
}

function ChartLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <i aria-hidden="true" className="size-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}

export function CashflowChart({ cashflow }: { cashflow: CashflowMonth[] }) {
  const values = cashflow.flatMap((month) => [toBillions(month.income), toBillions(month.expense)]);
  const scaleMax = Math.max(6, Math.ceil(Math.max(...values)));
  const ticks = [0, scaleMax / 3, (scaleMax * 2) / 3, scaleMax];
  const yFor = (value: number) => 190 - (value / scaleMax) * 170;

  return (
    <Card className="gap-4 rounded-lg">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={CARD_TITLE_CLASS}>درآمد و هزینه</h2>
          <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-muted-foreground">
            <ChartLegendItem color={INCOME_COLOR} label="درآمد" />
            <ChartLegendItem color={EXPENSE_COLOR} label="هزینه" />
            <small className="text-muted-foreground">میلیارد ریال</small>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <svg
          viewBox="0 0 600 220"
          role="img"
          aria-label="نمودار درآمد و هزینه شش ماه اخیر"
          className="block h-auto w-full"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1="30" x2="590" y1={yFor(tick)} y2={yFor(tick)} className="stroke-border" />
              <text
                x="24"
                y={yFor(tick) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {tick.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}
              </text>
            </g>
          ))}
          {cashflow.map((month, index) => {
            const income = toBillions(month.income);
            const expense = toBillions(month.expense);
            const x = 40 + index * 92;
            return (
              <g key={month.month}>
                <rect
                  x={x}
                  y={yFor(income)}
                  width="30"
                  height={(income / scaleMax) * 170}
                  rx="5"
                  fill={INCOME_COLOR}
                />
                <rect
                  x={x + 34}
                  y={yFor(expense)}
                  width="30"
                  height={(expense / scaleMax) * 170}
                  rx="5"
                  fill={EXPENSE_COLOR}
                />
                <text
                  x={x + 32}
                  y="210"
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {month.month}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

export function PaymentDonut({ paymentMethods }: { paymentMethods: PaymentMethodShare[] }) {
  const segments = paymentMethods.map((method, index) => ({
    method,
    color: PAYMENT_METHOD_COLORS[method.id] ?? 'var(--muted-foreground)',
    offset: paymentMethods.slice(0, index).reduce((sum, previous) => sum + previous.percentage, 0),
  }));

  return (
    <Card className="gap-4 rounded-lg">
      <CardHeader>
        <h2 className={CARD_TITLE_CLASS}>روش‌های پرداخت</h2>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-center gap-5">
          <svg
            viewBox="0 0 38 38"
            role="img"
            aria-label="سهم روش‌های پرداخت"
            className="size-[150px] -rotate-90"
          >
            {segments.map(({ method, color, offset: start }) => (
              <circle
                key={method.id}
                r="15.9"
                cx="19"
                cy="19"
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeDasharray={`${method.percentage - 1} ${101 - method.percentage}`}
                strokeDashoffset={-start}
              />
            ))}
          </svg>
          <ul className="flex flex-col gap-2 text-[12.5px] text-muted-foreground">
            {segments.map(({ method, color }) => (
              <li key={method.id} className="flex items-center gap-1.5">
                <i
                  aria-hidden="true"
                  className="size-2.5 rounded-[3px]"
                  style={{ background: color }}
                />
                <span>{method.label}</span>
                <b className="font-semibold tabular-nums">
                  {toFaDigits(String(method.percentage))}٪
                </b>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({
  cashflow,
  paymentMethods,
}: {
  cashflow: CashflowMonth[];
  paymentMethods: PaymentMethodShare[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <CashflowChart cashflow={cashflow} />
      <PaymentDonut paymentMethods={paymentMethods} />
    </div>
  );
}
