'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button, H1, P, SectionLayout, usePagination } from '@repo/web';
import { Plus, Printer } from 'lucide-react';
import { toast } from 'sonner';

import type { Branch, CreateBranchInput } from '../../assets/@types/branch';
import {
  createBranch,
  listAllBranches,
  listBranches,
  type BranchListResponse,
} from '../../lib/branches.service';
import { BranchesToolbar } from '../ui/BranchesToolbar';
import { BranchesPrintView } from './BranchesPrintView';
import { BranchesTable } from './BranchesTable';
import { AddBranchDialog } from './dialogs/AddBranchDialog';

type LoadResult =
  | { key: string; status: 'success'; response: BranchListResponse }
  | { key: string; status: 'error' };

type PrintSnapshot = {
  branches: Branch[];
  generatedAt: Date;
};

const LOAD_ERROR_MESSAGE = 'دریافت فهرست شعب با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';
const PRINT_ERROR_MESSAGE = 'آماده‌سازی گزارش چاپ با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

export function BranchesPage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';

  const [result, setResult] = useState<LoadResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [printSnapshot, setPrintSnapshot] = useState<PrintSnapshot | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  const requestKey = JSON.stringify({ ...queryParams, search, status, refreshIndex });

  useEffect(() => {
    let isActive = true;

    listBranches({ ...queryParams, search, status })
      .then((response) => {
        if (isActive) setResult({ key: requestKey, status: 'success', response });
      })
      .catch(() => {
        if (isActive) setResult({ key: requestKey, status: 'error' });
      });

    return () => {
      isActive = false;
    };
  }, [requestKey, queryParams, search, status]);

  // Prints once the report has been committed to the DOM, then drops the
  // snapshot so nothing stale can be printed from a later Ctrl+P.
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

  const settled = result !== null && result.key === requestKey ? result : null;
  const isLoading = settled === null;
  const response = settled?.status === 'success' ? settled.response : undefined;
  const errorMessage = settled?.status === 'error' ? LOAD_ERROR_MESSAGE : undefined;

  const handleStatusChange = useCallback(
    (nextStatus: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextStatus) {
        params.set('status', nextStatus);
      } else {
        params.delete('status');
      }
      params.delete('page');

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, router, searchParams],
  );

  async function handleCreate(input: CreateBranchInput) {
    await createBranch(input);
    setRefreshIndex((current) => current + 1);
  }

  async function handlePrint() {
    if (isPreparingPrint) return;

    setIsPreparingPrint(true);
    try {
      const branches = await listAllBranches({ search, status });
      setPrintSnapshot({ branches, generatedAt: new Date() });
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
          <H1 className="text-start text-xl font-bold sm:text-2xl">شعب</H1>
          <P className="text-sm text-muted-foreground">ساختار سازمانی و عملکرد هر شعبه</P>
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
            شعبه جدید
          </Button>
        </div>
      </div>

      <BranchesToolbar value={status} onChange={handleStatusChange} className="print:hidden" />

      <div className="print:hidden">
        <BranchesTable
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
      </div>

      {printSnapshot ? (
        <BranchesPrintView
          branches={printSnapshot.branches}
          generatedAt={printSnapshot.generatedAt}
        />
      ) : null}

      <AddBranchDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </SectionLayout>
  );
}
