'use client';

import { useEffect, useState } from 'react';
import { usePagination } from '@repo/web';
import { Button, Card, H1, P, SectionLayout } from '@repo/web';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

import type { Sale } from '../../assets/@types/sale';
import { listAllSales } from '../../lib/sales.service';
import { SELLERS, RATES } from '../../assets/mock/sales.mock';
import { useSales } from '../../hook/useSales';
import { useSalesFilters } from '../../hook/useSalesFilters';
import { SalesToolbar } from '../ui/SalesToolbar';
import { SalesTable } from './SalesTable';
import { formatMoney } from '../../utils/format';

export function SalesPage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const searchParams = useSearchParams();
  const { status, seller, discountState, setStatus, setSeller, setDiscountState } = useSalesFilters();

  const search = searchParams.get('search') ?? '';

  const { state } = useSales({ ...queryParams, search, status, seller, discountState });

  const [allSales, setAllSales] = useState<Sale[]>([]);

  useEffect(() => {
    listAllSales().then(setAllSales).catch(() => setAllSales([]));
  }, [state]);

  const isLoading = state.status === 'loading';
  const response = state.status === 'success' ? state.response : undefined;
  const errorMessage =
    state.status === 'error'
      ? 'دریافت فهرست فاکتورها با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
      : undefined;

  const sellerStats = SELLERS.map((s) => {
    const rows = allSales.filter((y) => y.seller === s);
    const total = rows.reduce((acc, r) => acc + Number(r.total), 0);
    const comm = rows.reduce((acc, r) => acc + Number(r.comm), 0);
    return { seller: s, count: rows.length, total, comm, rate: RATES[s] };
  });

  return (
    <SectionLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">فاکتورهای فروش</H1>
          <P className="text-sm text-muted-foreground">
            فاکتورها، تخفیف، فروشنده و پورسانت، پرداخت‌ها و مانده هر فاکتور
          </P>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/sales/new">
              <Plus className="size-4" aria-hidden="true" />
              فاکتور جدید
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {sellerStats.map((stat) => (
          <Card key={stat.seller} className="space-y-1 p-3">
            <P className="text-sm font-medium">{stat.seller}</P>
            <P className="text-base font-bold">
              {stat.count.toLocaleString('fa-IR')} فاکتور · {formatMoney(stat.total)} ریال
            </P>
            <P className="text-xs text-muted-foreground">
              پورسانت: {formatMoney(stat.comm)} ریال ({stat.rate}٪)
            </P>
          </Card>
        ))}
      </div>

      <SalesToolbar
        status={status}
        seller={seller}
        discountState={discountState}
        onStatusChange={setStatus}
        onSellerChange={setSeller}
        onDiscountStateChange={setDiscountState}
      />

      <SalesTable
        data={response?.data ?? []}
        meta={response?.meta}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={setLimit}
        loading={isLoading}
        error={errorMessage}
        searchTerm={search}
      />
    </SectionLayout>
  );
}
