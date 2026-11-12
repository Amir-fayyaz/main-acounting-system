'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, H1, Input, InputErrorMassage, P, SectionLayout, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Small } from '@repo/web';

import type { CreateSaleInput } from '../../assets/@types/sale';
import { createSale } from '../../lib/sales.service';
import { validateSaleForm } from '../../lib/sales.validation';
import { BRANCHES, NAMES, SELLERS } from '../../assets/mock/sales.mock';
import { formatMoney } from '../../utils/format';

const INITIAL: CreateSaleInput = {
  cust: NAMES[0],
  seller: SELLERS[0],
  branch: BRANCHES[0],
  desc: '',
  gross: '',
  discountPercent: '0',
  taxPercent: '0',
};

export function NewSalePage() {
  const router = useRouter();
  const [values, setValues] = useState<CreateSaleInput>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateSaleInput, string>>>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const gross = Number(values.gross || 0);
  const discountPercent = Number(values.discountPercent || 0);
  const taxPercent = Number(values.taxPercent || 0);
  const discountAmount = Math.round((gross * discountPercent) / 100);
  const subtotal = gross - discountAmount;
  const taxAmount = Math.round((subtotal * taxPercent) / 100);
  const total = subtotal + taxAmount;

  function handleChange(field: keyof CreateSaleInput, event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setValues((previous) => ({ ...previous, [field]: nextValue }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    }
  }

  function handleSelect(field: keyof CreateSaleInput, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validateSaleForm(values);
    setErrors(nextErrors);
    setFormError(undefined);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await createSale(values);
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

      <Card className="p-4">
        <form noValidate onSubmit={handleSubmit} className="grid gap-4">
          {formError ? <InputErrorMassage role="alert">{formError}</InputErrorMassage> : null}

          <div className="grid gap-2">
            <Small className="font-medium">مشتری</Small>
            <Select value={values.cust} onValueChange={(v) => handleSelect('cust', v)}>
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
            <Small className="font-medium">فروشنده</Small>
            <Select value={values.seller} onValueChange={(v) => handleSelect('seller', v)}>
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
            <Small className="font-medium">شعبه</Small>
            <Select value={values.branch} onValueChange={(v) => handleSelect('branch', v)}>
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
            <Small className="font-medium">شرح فاکتور</Small>
            <Input
              name="desc"
              type="text"
              value={values.desc}
              onChange={(e) => handleChange('desc', e)}
              aria-label="شرح فاکتور"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">مبلغ ناخالص (ریال)</Small>
            <Input
              name="gross"
              type="text"
              inputMode="numeric"
              value={values.gross}
              onChange={(e) => handleChange('gross', e)}
              aria-label="مبلغ ناخالص"
              disabled={submitting}
            />
            {errors.gross ? <InputErrorMassage role="alert">{errors.gross}</InputErrorMassage> : null}
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">تخفیف (٪)</Small>
            <Input
              name="discountPercent"
              type="text"
              inputMode="numeric"
              value={values.discountPercent}
              onChange={(e) => handleChange('discountPercent', e)}
              aria-label="تخفیف"
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Small className="font-medium">مالیات (٪)</Small>
            <Input
              name="taxPercent"
              type="text"
              inputMode="numeric"
              value={values.taxPercent}
              onChange={(e) => handleChange('taxPercent', e)}
              aria-label="مالیات"
              disabled={submitting}
            />
          </div>

          <div className="rounded-md border p-3 text-sm">
            <div className="flex justify-between"><span>تخفیف</span><span>{formatMoney(discountAmount)}</span></div>
            <div className="flex justify-between"><span>مالیات</span><span>{formatMoney(taxAmount)}</span></div>
            <div className="flex justify-between font-bold"><span>مبلغ نهایی</span><span>{formatMoney(total)}</span></div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push('/sales')} disabled={submitting}>
              انصراف
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'ذخیره…' : 'ذخیره فاکتور'}
            </Button>
          </div>
        </form>
      </Card>
    </SectionLayout>
  );
}
