import type { ReactNode } from 'react';
import Link from 'next/link';

import { Card, CardContent, CardHeader, H2 } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

import type { DashboardTask } from '../../assets/@types';
import type { Cheque, ChequeStatus, Invoice } from '../../../panel/assets/@types/finance';
import { toFaDigits } from '../../../shared/utils/persian-digits';
import { chequeStatusLabel } from '../../../panel/utils/status-label';

const CARD_TITLE_CLASS = 'text-[15px] font-bold';

const SMALL_ACTION_CLASS =
  'inline-flex h-8 items-center justify-center rounded-md border border-border bg-card px-2.5 text-[13px] font-semibold transition-colors hover:bg-muted';

const EMPTY_MESSAGE = 'هنوز موردی ثبت نشده است.';

const LIST_CLASS = 'divide-y divide-border';
const LIST_ITEM_CLASS = 'flex items-center justify-between gap-2.5 py-2.5 first:pt-0';

type ChequeTone = 'ok' | 'warn' | 'bad' | 'neutral';

const CHEQUE_TONES: Record<ChequeStatus, ChequeTone> = {
  pending: 'warn',
  collected: 'ok',
  'near-due': 'warn',
  returned: 'bad',
  overdue: 'bad',
  endorsed: 'neutral',
};

const CHEQUE_TONE_CLASS: Record<ChequeTone, string> = {
  ok: 'bg-secondary text-success',
  warn: 'bg-accent text-brand-link',
  bad: 'bg-destructive/10 text-destructive',
  neutral: 'bg-muted text-muted-foreground',
};

function formatMillions(money: string): string {
  const integerPart = money.split('.')[0];
  if (!/^\d+$/.test(integerPart)) return money;
  const millions = Number(BigInt(integerPart)) / 1e6;
  return `${millions.toLocaleString('fa-IR', { maximumFractionDigits: 1 })} م`;
}

function ListCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-4 rounded-lg">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <H2 className={CARD_TITLE_CLASS}>{title}</H2>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyList() {
  return <p className="py-6 text-center text-sm text-muted-foreground">{EMPTY_MESSAGE}</p>;
}

export function DashboardLists({
  invoices,
  cheques,
  tasks,
}: {
  invoices: Invoice[];
  cheques: Cheque[];
  tasks: DashboardTask[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ListCard
        title="آخرین فاکتورها"
        action={
          <Link href="/sales" className={SMALL_ACTION_CLASS}>
            همه
          </Link>
        }
      >
        {invoices.length === 0 ? (
          <EmptyList />
        ) : (
          <ul className={LIST_CLASS}>
            {invoices.map((invoice) => (
              <li key={invoice.id} className={LIST_ITEM_CLASS}>
                <span className="min-w-0">
                  {invoice.customerName}
                  <small className="block text-muted-foreground">
                    فاکتور {toFaDigits(invoice.number)}
                  </small>
                </span>
                <span className="shrink-0 tabular-nums">{formatMillions(invoice.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </ListCard>

      <ListCard
        title="چک‌های نزدیک سررسید"
        action={
          <Link href="/checks" className={SMALL_ACTION_CLASS}>
            همه
          </Link>
        }
      >
        {cheques.length === 0 ? (
          <EmptyList />
        ) : (
          <ul className={LIST_CLASS}>
            {cheques.map((cheque) => (
              <li key={cheque.id} className={LIST_ITEM_CLASS}>
                <span className="min-w-0">
                  {cheque.counterparty}
                  <small className="block text-muted-foreground">{cheque.dueDate}</small>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
                    CHEQUE_TONE_CLASS[CHEQUE_TONES[cheque.status]],
                  )}
                >
                  {chequeStatusLabel(cheque.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ListCard>

      <ListCard title="تسک‌های من">
        {tasks.length === 0 ? (
          <EmptyList />
        ) : (
          <ul className={LIST_CLASS}>
            {tasks.map((task) => (
              <li key={task.id} className={LIST_ITEM_CLASS}>
                <label className="flex min-w-0 items-center gap-2.5">
                  <input type="checkbox" className="size-4 shrink-0 accent-primary" />
                  {task.title}
                </label>
                <small className="shrink-0 text-muted-foreground">{task.due}</small>
              </li>
            ))}
          </ul>
        )}
      </ListCard>
    </div>
  );
}
