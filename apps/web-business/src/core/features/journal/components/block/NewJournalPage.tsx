'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CiSquareChevRight } from 'react-icons/ci';
import { toast } from 'sonner';

import { Button, SectionLayout } from '@repo/web';
import { PageHeader } from '../../../panel/components/ui/PageHeader';

import type { JournalLine } from '../../assets/@types';
import { CHART_OF_ACCOUNTS } from '../../assets/mock/journal';
import { createJournalEntry, getNextJournalNumber } from '../../lib/journal-api';
import { parseNumericDigits } from '../../utils/journal-formatters';
import { NewJournalHeaderCard } from '../ui/NewJournalHeaderCard';
import { NewJournalLinesTable } from '../ui/NewJournalLinesTable';
import { NewJournalTotalsCard } from '../ui/NewJournalTotalsCard';

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
        <NewJournalHeaderCard
          date={date}
          entryNumber={entryNumber}
          description={description}
          onDateChange={setDate}
          onDescriptionChange={setDescription}
        />

        <NewJournalLinesTable
          lines={lines}
          onAccountChange={handleAccountChange}
          onAmountChange={handleAmountChange}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
        />

        <NewJournalTotalsCard
          isBalanced={isBalanced}
          description={description}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          diff={diff}
        />

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
