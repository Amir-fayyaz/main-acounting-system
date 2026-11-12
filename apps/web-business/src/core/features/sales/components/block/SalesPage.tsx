'use client';

import { useEffect, useState } from 'react';
import { usePagination } from '@repo/web';
import { Button, Card, CardContent, H1, P, SectionLayout } from '@repo/web';
import { Plus, Printer } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

import type { Sale } from '../../assets/@types/sale';
import { listAllSales } from '../../lib/sales.service';
import { SELLERS, RATES } from '../../assets/mock/sales.mock';
import { useSales } from '../../hook/useSales';
import { useSalesFilters } from '../../hook/useSalesFilters';
import { SalesToolbar } from '../ui/SalesToolbar';
import { SalesTable } from './SalesTable';
import { SalesPrintView } from './SalesPrintView';
import { formatMoney } from '../../utils/format';

type PrintSnapshot = {
  sales: Sale[];
  generatedAt: Date;
};

const PRINT_ERROR_MESSAGE = 'آماده‌سازی گزارش چاپ با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

export function SalesPage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const { status, seller, discountState, search, setStatus, setSeller, setDiscountState, setSearch } =
    useSalesFilters();

  const { state } = useSales({ ...queryParams, search, status, seller, discountState });

  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [printSnapshot, setPrintSnapshot] = useState<PrintSnapshot | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  useEffect(() => {
    listAllSales({ search, status, seller, discountState })
      .then(setAllSales)
      .catch(() => setAllSales([]));
  }, [search, status, seller, discountState]);

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
  const errorMessage =
    state.status === 'error'
      ? 'دریافت فهرست فاکتورها با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
      : undefined;

  const totalSales = allSales.reduce((acc, sale) => acc + Number(sale.total), 0);
  const totalDiscount = allSales.reduce((acc, sale) => acc + Number(sale.disc), 0);
  const discountCount = allSales.filter((sale) => Number(sale.disc) > 0).length;
  const outstanding = allSales.reduce(
    (acc, sale) => acc + (Number(sale.total) - Number(sale.paid)),
    0,
  );
  const totalCommission = allSales.reduce((acc, sale) => acc + Number(sale.comm), 0);

  const sellerStats = SELLERS.map((s) => {
    const rows = allSales.filter((y) => y.seller === s);
    const total = rows.reduce((acc, r) => acc + Number(r.total), 0);
    const comm = rows.reduce((acc, r) => acc + Number(r.comm), 0);
    return { seller: s, count: rows.length, total, comm, rate: RATES[s] };
  });

  async function handlePrint() {
    if (isPreparingPrint) return;

    setIsPreparingPrint(true);
    try {
      const sales = await listAllSales({ search, status, seller, discountState });
      setPrintSnapshot({ sales, generatedAt: new Date() });
    } catch {
      toast.error(PRINT_ERROR_MESSAGE);
    } finally {
      setIsPreparingPrint(false);
    }
  }

  return (
    <SectionLayout>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">فاکتورهای فروش</H1>
          <P className="text-sm text-muted-foreground">
            فاکتورها، تخفیف، فروشنده و پورسانت، پرداخت‌ها و مانده هر فاکتور
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

          <Button asChild size="sm">
            <Link href="/sales/new">
              <Plus className="size-4" aria-hidden="true" />
              فاکتور جدید
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
        <Card className="gap-2">
          <CardContent className="grid gap-1 py-4">
            <span className="text-sm text-muted-foreground">جمع فروش (پس از تخفیف)</span>
            <b className="text-lg font-semibold">{formatMoney(totalSales)} ریال</b>
          </CardContent>
        </Card>
        <Card className="gap-2">
          <CardContent className="grid gap-1 py-4">
            <span className="text-sm text-muted-foreground">جمع تخفیف‌ها</span>
            <b className="text-lg font-semibold">
              {formatMoney(totalDiscount)} ریال · {discountCount.toLocaleString('fa-IR')} فاکتور
            </b>
          </CardContent>
        </Card>
        <Card className="gap-2">
          <CardContent className="grid gap-1 py-4">
            <span className="text-sm text-muted-foreground">مانده مطالبات</span>
            <b className="text-lg font-semibold">{formatMoney(outstanding)} ریال</b>
          </CardContent>
        </Card>
        <Card className="gap-2">
          <CardContent className="grid gap-1 py-4">
            <span className="text-sm text-muted-foreground">جمع پورسانت فروشندگان</span>
            <b className="text-lg font-semibold">{formatMoney(totalCommission)} ریال</b>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2 print:hidden">
        <P className="text-sm text-muted-foreground">عملکرد فروشندگان (طبق فیلترهای فعلی)</P>
        <div className="grid gap-3 sm:grid-cols-3">
          {sellerStats.map((stat) => (
            <Card key={stat.seller} className="space-y-1 p-3">
              <P className="text-sm font-medium">{stat.seller}</P>
              <P className="text-base font-bold">
                {stat.count.toLocaleString('fa-IR')} فاکتور · {formatMoney(stat.total)} ریال
              </P>
              <P className="text-xs text-muted-foreground">
                پورسانت: {formatMoney(stat.comm)} ریال ({stat.rate.toLocaleString('fa-IR')}٪)
              </P>
            </Card>
          ))}
        </div>
      </div>

      <SalesToolbar
        status={status}
        seller={seller}
        discountState={discountState}
        onStatusChange={setStatus}
        onSellerChange={setSeller}
        onDiscountStateChange={setDiscountState}
        className="print:hidden"
      />

      <div className="print:hidden">
        <SalesTable
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
        <SalesPrintView
          sales={printSnapshot.sales}
          generatedAt={printSnapshot.generatedAt}
        />
      ) : null}
    </SectionLayout>
  );
}
