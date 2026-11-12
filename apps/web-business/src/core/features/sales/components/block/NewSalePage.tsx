'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  H1,
  Input,
  InputErrorMassage,
  P,
  SectionLayout,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Small,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/web';
import { Download, Plus, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import type { CreateSaleInput } from '../../assets/@types/sale';
import { createSale } from '../../lib/sales.service';
import { validateSaleForm } from '../../lib/sales.validation';
import { BRANCHES, NAMES, RATES, SELLERS } from '../../assets/mock/sales.mock';
import { formatMoney } from '../../utils/format';

type LineItem = { name: string; qty: string; price: string };
type Payment = { method: string; amount: string };

const PAYMENT_METHODS = ['نقد', 'کارت', 'چک', 'حواله'];
const INVOICE_TYPES = ['فاکتور فروش', 'پیش‌فاکتور'];

const INITIAL_LINES: LineItem[] = [{ name: 'خدمات حسابداری', qty: '1', price: '25000000' }];
const INITIAL_PAYMENTS: Payment[] = [{ method: 'نقد', amount: '' }];

function parseNumber(value: string): number {
  return Number(value.replace(/[٬,\s]/g, '')) || 0;
}

export function NewSalePage() {
  const router = useRouter();

  const [cust, setCust] = useState(NAMES[0]);
  const [seller, setSeller] = useState<string>(SELLERS[0]);
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [invoiceType, setInvoiceType] = useState(INVOICE_TYPES[0]);
  const [date, setDate] = useState<string>(new Date().toLocaleDateString('fa-IR'));
  const [desc, setDesc] = useState('');
  const [lines, setLines] = useState<LineItem[]>(INITIAL_LINES);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [discountPercent, setDiscountPercent] = useState('0');
  const [taxPercent, setTaxPercent] = useState('10');
  const [errors, setErrors] = useState<Partial<Record<keyof CreateSaleInput, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const subtotal = lines.reduce((sum, line) => sum + parseNumber(line.qty) * parseNumber(line.price), 0);
  const discountAmount = Math.round((subtotal * parseNumber(discountPercent)) / 100);
  const taxable = subtotal - discountAmount;
  const taxAmount = Math.round((taxable * parseNumber(taxPercent)) / 100);
  const total = taxable + taxAmount;
  const paid = payments.reduce((sum, payment) => sum + parseNumber(payment.amount), 0);
  const rest = Math.max(total - paid, 0);
  const rate = RATES[seller] ?? 0;
  const commission = Math.round(((total - taxAmount) * rate) / 100);

  const status =
    total > 0 && paid === total ? 'تسویه‌شده' : paid > 0 ? 'پرداخت جزئی' : 'تسویه‌نشده';

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function updatePayment(index: number, patch: Partial<Payment>) {
    setPayments((current) => current.map((payment, i) => (i === index ? { ...payment, ...patch } : payment)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const values: CreateSaleInput = {
      cust,
      seller,
      branch,
      desc,
      gross: String(subtotal),
      discountPercent,
      taxPercent,
      paid: String(paid),
      date,
    };

    const nextErrors = validateSaleForm(values);
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.keys(nextErrors).length > 0) {
      setFormError('لطفاً خطاهای فرم را برطرف کنید.');
      return;
    }

    if (paid > total) {
      setFormError('مبلغ پرداخت از مبلغ فاکتور بیشتر است.');
      return;
    }

    setSubmitting(true);
    try {
      await createSale(values);
      toast.success('فاکتور ثبت شد');
      router.push('/sales');
    } catch (error) {
      setSubmitting(false);
      setFormError(
        error instanceof Error && error.message
          ? error.message
          : 'ثبت فاکتور با مشکل مواجه شد. لطفاً دوباره تلاش کنید.',
      );
    }
  }

  return (
    <SectionLayout>
      <div className="space-y-1">
        <H1 className="text-start text-xl font-bold sm:text-2xl">فاکتور فروش جدید</H1>
        <P className="text-sm text-muted-foreground">چند روش پرداخت و پرداخت جزئی پشتیبانی می‌شود</P>
      </div>

      <form noValidate onSubmit={handleSubmit} className="grid gap-4">
        {formError ? <InputErrorMassage role="alert">{formError}</InputErrorMassage> : null}

        <Card className="p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-2">
              <Small className="font-medium">مشتری</Small>
              <Select value={cust} onValueChange={setCust} disabled={submitting}>
                <SelectTrigger aria-label="مشتری" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NAMES.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cust ? <InputErrorMassage role="alert">{errors.cust}</InputErrorMassage> : null}
            </div>

            <div className="grid gap-2">
              <Small className="font-medium">تاریخ</Small>
              <Input value={date} onChange={(e) => setDate(e.target.value)} aria-label="تاریخ" disabled={submitting} />
            </div>

            <div className="grid gap-2">
              <Small className="font-medium">شعبه</Small>
              <Select value={branch} onValueChange={setBranch} disabled={submitting}>
                <SelectTrigger aria-label="شعبه" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Small className="font-medium">فروشنده</Small>
              <Select value={seller} onValueChange={setSeller} disabled={submitting}>
                <SelectTrigger aria-label="فروشنده" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SELLERS.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.seller ? <InputErrorMassage role="alert">{errors.seller}</InputErrorMassage> : null}
            </div>

            <div className="grid gap-2">
              <Small className="font-medium">نوع</Small>
              <Select value={invoiceType} onValueChange={setInvoiceType} disabled={submitting}>
                <SelectTrigger aria-label="نوع فاکتور" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVOICE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <Small className="font-medium">شرح فاکتور</Small>
            <Input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="توضیحات حسابدار درباره‌ی این فاکتور (اختیاری)"
              aria-label="شرح فاکتور"
              disabled={submitting}
            />
          </div>
        </Card>

        <Card className="p-4">
          <Table aria-label="ردیف‌های فاکتور">
            <TableHeader>
              <TableRow>
                <TableHead>کالا / خدمت</TableHead>
                <TableHead>تعداد</TableHead>
                <TableHead>قیمت واحد (ریال)</TableHead>
                <TableHead>جمع (ریال)</TableHead>
                <TableHead aria-label="حذف" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={line.name}
                      onChange={(e) => updateLine(index, { name: e.target.value })}
                      aria-label="کالا"
                      disabled={submitting}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.qty}
                      inputMode="numeric"
                      onChange={(e) => updateLine(index, { qty: e.target.value })}
                      aria-label="تعداد"
                      disabled={submitting}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={line.price}
                      inputMode="numeric"
                      onChange={(e) => updateLine(index, { price: e.target.value })}
                      aria-label="قیمت"
                      disabled={submitting}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatMoney(parseNumber(line.qty) * parseNumber(line.price))}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="حذف"
                      disabled={submitting || lines.length < 2}
                      onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((current) => [...current, { name: '', qty: '1', price: '' }])}
              disabled={submitting}
            >
              <Plus className="size-4" aria-hidden="true" />
              ردیف جدید
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center justify-between gap-2 pb-3">
              <Small className="text-base font-bold">پرداخت‌ها</Small>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPayments((current) => [...current, { method: 'کارت', amount: '' }])}
                disabled={submitting}
              >
                <Plus className="size-4" aria-hidden="true" />
                روش پرداخت
              </Button>
            </div>

            <Table aria-label="پرداخت‌ها">
              <TableHeader>
                <TableRow>
                  <TableHead>روش</TableHead>
                  <TableHead>مبلغ (ریال)</TableHead>
                  <TableHead aria-label="حذف" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={payment.method}
                        onValueChange={(value) => updatePayment(index, { method: value })}
                        disabled={submitting}
                      >
                        <SelectTrigger aria-label="روش پرداخت" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={payment.amount}
                        inputMode="numeric"
                        onChange={(e) => updatePayment(index, { amount: e.target.value })}
                        aria-label="مبلغ پرداخت"
                        disabled={submitting}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="حذف"
                        disabled={submitting || payments.length < 2}
                        onClick={() => setPayments((current) => current.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="p-4">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <Small>جمع ردیف‌ها</Small>
                <Small className="font-medium tabular-nums">{formatMoney(subtotal)}</Small>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Small className="font-medium">تخفیف (درصد)</Small>
                  <Input
                    value={discountPercent}
                    inputMode="numeric"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDiscountPercent(e.target.value)}
                    aria-label="تخفیف"
                    disabled={submitting}
                  />
                </div>
                <div className="grid gap-2">
                  <Small className="font-medium">مالیات بر ارزش افزوده (درصد)</Small>
                  <Input
                    value={taxPercent}
                    inputMode="numeric"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTaxPercent(e.target.value)}
                    aria-label="مالیات"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Small>مالیات</Small>
                <Small className="font-medium tabular-nums">{formatMoney(taxAmount)}</Small>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <Small className="text-base font-bold">مبلغ نهایی</Small>
                <Small className="text-base font-bold tabular-nums">{formatMoney(total)}</Small>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Small>پرداخت‌شده</Small>
                <Small className="font-medium tabular-nums">{formatMoney(paid)}</Small>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Small>مانده</Small>
                <Small className="font-medium tabular-nums">{formatMoney(rest)}</Small>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Small>پورسانت فروشنده ({rate.toLocaleString('fa-IR')}٪)</Small>
                <Small className="font-medium tabular-nums">{formatMoney(commission)}</Small>
              </div>

              {paid > total ? (
                <P className="rounded-sm bg-accent p-3 text-xs text-accent-foreground" role="alert">
                  مبلغ پرداخت از مبلغ فاکتور بیشتر است.
                </P>
              ) : total > 0 ? (
                <div>
                  <Badge variant={status === 'تسویه‌شده' ? 'success' : status === 'پرداخت جزئی' ? 'secondary' : 'destructive'}>
                    {status}
                  </Badge>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={submitting || total <= 0 || paid > total}>
            {submitting ? 'در حال ثبت…' : 'ثبت فاکتور'}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" aria-hidden="true" />
            چاپ
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => toast('خروجی PDF در نسخه نهایی ساخته می‌شود')}
          >
            <Download className="size-4" aria-hidden="true" />
            خروجی PDF
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/sales')} disabled={submitting}>
            انصراف
          </Button>
        </div>
      </form>
    </SectionLayout>
  );
}
