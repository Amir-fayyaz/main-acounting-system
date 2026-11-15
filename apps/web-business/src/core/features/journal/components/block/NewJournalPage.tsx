'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CiCirclePlus, CiSquareChevRight, CiTrash } from 'react-icons/ci';
import { toast } from 'sonner';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  SectionLayout,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { JournalLine } from '../../assets/@types';
import { CHART_OF_ACCOUNTS } from '../../assets/mock/journal';
import { createJournalEntry, getNextJournalNumber } from '../../lib/journal-api';
import {
  formatMoneyAmount,
  parseNumericDigits,
  toPersianDigits,
} from '../../utils/journal-formatters';

function createDefaultLine(accountCode: string, accountName: string): JournalLine {
  return {
    id: `line-${Math.random().toString(36).substring(2, 9)}`,
    accountCode,
    accountName,
    debit: '',
    credit: '',
  };
}

export function NewJournalPage() {
  const router = useRouter();
  const [date, setDate] = useState('۱۴۰۵/۰۸/۰۵');
  const [entryNumber] = useState(() => getNextJournalNumber());
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lines, setLines] = useState<JournalLine[]>([
    createDefaultLine(CHART_OF_ACCOUNTS[0].code, CHART_OF_ACCOUNTS[0].name),
    createDefaultLine(CHART_OF_ACCOUNTS[1].code, CHART_OF_ACCOUNTS[1].name),
  ]);

  const handleAccountChange = (index: number, code: string) => {
    const selected = CHART_OF_ACCOUNTS.find((item) => item.code === code);
    if (!selected) return;

    setLines((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        accountCode: selected.code,
        accountName: selected.name,
      };
      return copy;
    });
  };

  const handleAmountChange = (index: number, field: 'debit' | 'credit', rawValue: string) => {
    const numeric = parseNumericDigits(rawValue);

    setLines((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        debit: field === 'debit' ? numeric : '',
        credit: field === 'credit' ? numeric : '',
      };
      return copy;
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      createDefaultLine(CHART_OF_ACCOUNTS[0].code, CHART_OF_ACCOUNTS[0].name),
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDebit = lines.reduce((acc, line) => acc + BigInt(line.debit || '0'), BigInt(0));
  const totalCredit = lines.reduce((acc, line) => acc + BigInt(line.credit || '0'), BigInt(0));
  const diff = totalDebit > totalCredit ? totalDebit - totalCredit : totalCredit - totalDebit;

  const isBalanced = totalDebit === totalCredit && totalDebit > BigInt(0);
  const canSaveBalanced = isBalanced && description.trim().length > 0;

  const handleSave = async (status: 'balanced' | 'draft') => {
    if (status === 'balanced' && !canSaveBalanced) return;

    setIsSubmitting(true);
    try {
      const amountVal = (totalDebit > BigInt(0) ? totalDebit : totalCredit).toString();
      await createJournalEntry({
        number: entryNumber,
        date,
        description: description.trim() || 'سند حسابداری بدون شرح',
        amount: `${amountVal}.00`,
        currency: 'IRR',
        status,
      });

      if (status === 'balanced') {
        toast.success('سند با موفقیت ثبت شد');
      } else {
        toast.success('پیش‌نویس سند ذخیره شد');
      }

      router.push('/journal');
    } catch {
      toast.error('خطا در ثبت سند. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionLayout>
      <PageHeader
        title="ثبت سند مرکب"
        description="سند فقط با تراز بودن بدهکار و بستانکار ثبت می‌شود"
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/journal">
              <CiSquareChevRight className="size-4 me-1.5" />
              بازگشت به دفتر روزنامه
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6">
        {/* Document Header Card */}
        <Card>
          <CardHeader>
            <CardTitle>مشخصات سند</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="journal-date" className="text-sm font-medium">
                  تاریخ سند
                </label>
                <Input
                  id="journal-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="۱۴۰۵/۰۸/۰۵"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="journal-number" className="text-sm font-medium">
                  شماره سند
                </label>
                <Input
                  id="journal-number"
                  value={toPersianDigits(entryNumber)}
                  readOnly
                  disabled
                  className="bg-muted text-muted-foreground"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="journal-desc" className="text-sm font-medium">
                  شرح سند
                </label>
                <Input
                  id="journal-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثلاً: ثبت هزینه اجاره آبان"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document Lines Table Card */}
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
                          onChange={(e) => handleAccountChange(index, e.target.value)}
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
                          onChange={(e) => handleAmountChange(index, 'debit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          aria-label={`بستانکار ردیف ${toPersianDigits(index + 1)}`}
                          inputMode="numeric"
                          className="text-end tabular-nums"
                          placeholder="۰"
                          value={line.credit ? formatMoneyAmount(line.credit) : ''}
                          onChange={(e) => handleAmountChange(index, 'credit', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`حذف ردیف ${toPersianDigits(index + 1)}`}
                          disabled={lines.length <= 2}
                          onClick={() => handleRemoveLine(index)}
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
              <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
                <CiCirclePlus className="size-4 me-1.5" />
                ردیف جدید
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Balance Status & Totals Split Card */}
        <Card>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-6">
            {/* Status Message */}
            <div
              data-testid="journal-balance-message"
              className="p-4 rounded-md border border-border text-sm"
            >
              {isBalanced ? (
                description.trim() ? (
                  <div className="text-success font-medium">
                    ✓ سند تراز است و آماده ثبت می‌باشد.
                  </div>
                ) : (
                  <div className="text-primary font-medium">
                    سند تراز است. شرح سند را وارد کنید.
                  </div>
                )
              ) : totalDebit === BigInt(0) && totalCredit === BigInt(0) ? (
                <div className="text-muted-foreground">
                  مبلغ بدهکار و بستانکار را در ردیف‌ها وارد کنید.
                </div>
              ) : (
                <div className="text-destructive font-medium">
                  سند تراز نیست؛ اختلاف را اصلاح کنید.
                </div>
              )}
            </div>

            {/* Totals Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>جمع بدهکار:</span>
                <span className="tabular-nums font-semibold text-foreground">
                  {formatMoneyAmount(totalDebit.toString())} ریال
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>جمع بستانکار:</span>
                <span className="tabular-nums font-semibold text-foreground">
                  {formatMoneyAmount(totalCredit.toString())} ریال
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border font-bold text-base">
                <span>اختلاف:</span>
                <span
                  data-testid="journal-difference"
                  className={`tabular-nums ${diff === BigInt(0) ? 'text-success' : 'text-destructive'}`}
                >
                  {formatMoneyAmount(diff.toString())} ریال
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Page Actions */}
        <div className="flex items-center gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleSave('draft')}
          >
            ذخیره پیش‌نویس
          </Button>
          <Button
            type="button"
            disabled={!canSaveBalanced || isSubmitting}
            onClick={() => handleSave('balanced')}
          >
            ثبت سند
          </Button>
        </div>
      </div>
    </SectionLayout>
  );
}
