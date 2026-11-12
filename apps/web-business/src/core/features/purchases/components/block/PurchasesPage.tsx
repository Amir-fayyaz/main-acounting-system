'use client';

import { useEffect, useState } from 'react';

import { usePagination } from '@repo/web';
import { Button, Card, CardContent, H1, P, SectionLayout } from '@repo/web';
import { Plus, Printer } from 'lucide-react';
import { toast } from 'sonner';

import type { Purchase } from '../../assets/@types/purchase';
import { createPurchase, listAllPurchases } from '../../lib/purchases.service';
import { usePurchases } from '../../hook/usePurchases';
import { usePurchaseFilters } from '../../hook/usePurchaseFilters';
import { PurchasesToolbar } from '../ui/PurchasesToolbar';
import { PurchasesTable } from './PurchasesTable';
import { PurchasesPrintView } from './PurchasesPrintView';
import { AddPurchaseDialog } from './dialogs/AddPurchaseDialog';
import { formatMoney } from '../../utils/format';

type PrintSnapshot = {
  purchases: Purchase[];
  generatedAt: Date;
};

const PRINT_ERROR_MESSAGE = 'آماده‌سازی گزارش چاپ با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

export function PurchasesPage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const { status, discountState, search, setStatus, setDiscountState, setSearch } =
    usePurchaseFilters();

  const { state, refresh } = usePurchases({ ...queryParams, search, status, discountState });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [printSnapshot, setPrintSnapshot] = useState<PrintSnapshot | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  useEffect(() => {
    if (!printSnapshot) return;

    function handleAfterPrint() {
      setPrintSnapshot(null);
    }

    window.addEventListener('afterprint', handleAfterPrint);
    const frame = requestAnimationFrame(() => {
      window.print();
    });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [printSnapshot]);

  const isLoading = state.status === 'loading';
  const response = state.status === 'success' ? state.response : undefined;
  const allPurchases: Purchase[] = state.status === 'success' ? state.all : [];
  const errorMessage = state.status === 'error' ? 'دریافت فهرست خریدها با مشکل مواجه شد. لطفاً دوباره تلاش کنید.' : undefined;

  const totalAmount = allPurchases.reduce((sum, p) => sum + Number(p.total), 0);
  const totalDiscount = allPurchases.reduce((sum, p) => sum + p.discount, 0);
  const discountedCount = allPurchases.filter((p) => p.discount > 0).length;

  async function handleCreate(input: Parameters<typeof createPurchase>[0]) {
    await createPurchase(input);
    refresh();
  }

  async function handlePrint() {
    if (isPreparingPrint) return;

    setIsPreparingPrint(true);
    try {
      const purchases = await listAllPurchases({ search, status, discountState });
      setPrintSnapshot({ purchases, generatedAt: new Date() });
    } catch {
      toast.error(PRINT_ERROR_MESSAGE);
    } finally {
      setIsPreparingPrint(false);
    }
  }

  const handleStatusChange = setStatus;
  const handleDiscountStateChange = setDiscountState;

  return (
    <SectionLayout>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">فاکتورهای خرید</H1>
          <P className="text-sm text-muted-foreground">
            خرید از تأمین‌کنندگان، تخفیف و بدهی‌های باز
          </P>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isPreparingPrint}
          >
            <Printer className="size-4" aria-hidden="true" />
            {isPreparingPrint ? 'در حال آماده‌سازی…' : 'چاپ'}
          </Button>

          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            فاکتور خرید
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 print:hidden">
        <Card className="gap-2">
          <CardContent className="grid gap-1 py-4">
            <span className="text-sm text-muted-foreground">جمع خرید (پس از تخفیف)</span>
            <b className="text-lg font-semibold">{formatMoney(totalAmount)} ریال</b>
          </CardContent>
        </Card>
        <Card className="gap-2">
          <CardContent className="grid gap-1 py-4">
            <span className="text-sm text-muted-foreground">جمع تخفیف‌ها</span>
            <b className="text-lg font-semibold">{formatMoney(totalDiscount)} ریال</b>
          </CardContent>
        </Card>
        <Card className="gap-2">
          <CardContent className="grid gap-1 py-4">
            <span className="text-sm text-muted-foreground">فاکتورهای دارای تخفیف</span>
            <b className="text-lg font-semibold">{formatMoney(discountedCount)}</b>
          </CardContent>
        </Card>
      </div>

      <PurchasesToolbar
        status={status}
        discountState={discountState}
        onStatusChange={handleStatusChange}
        onDiscountStateChange={handleDiscountStateChange}
        className="print:hidden"
      />

      <div className="print:hidden">
        <PurchasesTable
          data={response?.data ?? []}
          meta={response?.meta}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          loading={isLoading}
          error={errorMessage}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      {printSnapshot ? (
        <PurchasesPrintView
          purchases={printSnapshot.purchases}
          generatedAt={printSnapshot.generatedAt}
        />
      ) : null}

      <AddPurchaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={handleCreate}
      />
    </SectionLayout>
  );
}
