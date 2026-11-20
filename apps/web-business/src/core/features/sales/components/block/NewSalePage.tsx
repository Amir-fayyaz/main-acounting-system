'use client';

import { Button, H1, InputErrorMassage, P, SectionLayout } from '@repo/web';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';

import { useNewSaleForm } from '../../hook/useNewSaleForm';
import { SaleInvoiceInfo } from './new-sale/SaleInvoiceInfo';
import { SaleItemsSection } from './new-sale/SaleItemsSection';
import { SalePaymentsSection } from './new-sale/SalePaymentsSection';
import { SaleSummarySection } from './new-sale/SaleSummarySection';

export function NewSalePage() {
  const form = useNewSaleForm();

  return (
    <SectionLayout>
      <div className="space-y-1">
        <H1 className="text-start text-xl font-bold sm:text-2xl">فاکتور فروش جدید</H1>
        <P className="text-sm text-muted-foreground">
          چند روش پرداخت و پرداخت جزئی پشتیبانی می‌شود
        </P>
      </div>

      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void form.submit();
        }}
      >
        {form.formError ? <InputErrorMassage role="alert">{form.formError}</InputErrorMassage> : null}

        <SaleInvoiceInfo {...form.invoice} />

        <SaleItemsSection {...form.items} />

        <div className="grid gap-4 lg:grid-cols-2">
          <SalePaymentsSection {...form.payments} />
          <SaleSummarySection {...form.summary} />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="submit" disabled={!form.canSubmit}>
            {form.submitting ? 'در حال ثبت…' : 'ثبت فاکتور'}
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
          <Button type="button" variant="ghost" onClick={form.cancel} disabled={form.submitting}>
            انصراف
          </Button>
        </div>
      </form>
    </SectionLayout>
  );
}
