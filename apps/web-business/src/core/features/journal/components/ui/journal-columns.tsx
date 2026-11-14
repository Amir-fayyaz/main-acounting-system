import type { DataTableColumn } from '@repo/web';
import type { JournalEntry } from '../../assets/@types';
import { formatMoneyAmount, toPersianDigits } from '../../utils/journal-formatters';
import { JournalStatusBadge } from './JournalStatusBadge';

export const journalColumns: DataTableColumn<JournalEntry>[] = [
  {
    key: 'number',
    header: 'شماره سند',
    cell: (entry) => toPersianDigits(entry.number),
  },
  {
    key: 'date',
    header: 'تاریخ',
  },
  {
    key: 'description',
    header: 'شرح',
  },
  {
    key: 'amount',
    header: 'مبلغ (ریال)',
    className: 'text-end tabular-nums',
    headerClassName: 'text-end',
    cell: (entry) => formatMoneyAmount(entry.amount),
  },
  {
    key: 'status',
    header: 'وضعیت',
    cell: (entry) => <JournalStatusBadge status={entry.status} />,
  },
];
