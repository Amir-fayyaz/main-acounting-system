import { CiCirclePlus, CiTrash } from 'react-icons/ci';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import type { JournalLine } from '../../assets/@types';
import { CHART_OF_ACCOUNTS } from '../../assets/mock/journal';
import { formatMoneyAmount, toPersianDigits } from '../../utils/journal-formatters';

export interface NewJournalLinesTableProps {
  lines: JournalLine[];
  onAccountChange: (index: number, code: string) => void;
  onAmountChange: (index: number, field: 'debit' | 'credit', rawValue: string) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
}

export function NewJournalLinesTable({
  lines,
  onAccountChange,
  onAmountChange,
  onAddLine,
  onRemoveLine,
}: NewJournalLinesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ردیف‌های سند</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border overflow-x-auto">
          <Table aria-label="ردیف‌های سند">
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2 min-w-[200px]">حساب</TableHead>
                <TableHead className="w-1/4 min-w-[150px] text-end">بدهکار (ریال)</TableHead>
                <TableHead className="w-1/4 min-w-[150px] text-end">بستانکار (ریال)</TableHead>
                <TableHead className="w-16 text-center"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <select
                      aria-label={`حساب ردیف ${toPersianDigits(index + 1)}`}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      value={line.accountCode}
                      onChange={(e) => onAccountChange(index, e.target.value)}
                    >
                      {CHART_OF_ACCOUNTS.map((acc) => (
                        <option key={acc.code} value={acc.code}>
                          {acc.label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`بدهکار ردیف ${toPersianDigits(index + 1)}`}
                      inputMode="numeric"
                      className="text-end tabular-nums"
                      placeholder="۰"
                      value={line.debit ? formatMoneyAmount(line.debit) : ''}
                      onChange={(e) => onAmountChange(index, 'debit', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      aria-label={`بستانکار ردیف ${toPersianDigits(index + 1)}`}
                      inputMode="numeric"
                      className="text-end tabular-nums"
                      placeholder="۰"
                      value={line.credit ? formatMoneyAmount(line.credit) : ''}
                      onChange={(e) => onAmountChange(index, 'credit', e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`حذف ردیف ${toPersianDigits(index + 1)}`}
                      disabled={lines.length <= 2}
                      onClick={() => onRemoveLine(index)}
                    >
                      <CiTrash className="size-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div>
          <Button type="button" variant="outline" size="sm" onClick={onAddLine}>
            <CiCirclePlus className="size-4 me-1.5" />
            ردیف جدید
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
