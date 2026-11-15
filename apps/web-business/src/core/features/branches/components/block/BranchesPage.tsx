'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePagination } from '@repo/web';
import { Button, H1, P, SectionLayout } from '@repo/web';
import { Plus, Printer } from 'lucide-react';
import { toast } from 'sonner';

import type { Branch, CreateBranchInput } from '../../assets/@types/branch';
import { createBranch, listAllBranches } from '../../lib/branches.service';
import { useBranches } from '../../hook/useBranches';
import { useBranchFilters } from '../../hook/useBranchFilters';
import { BranchesToolbar } from '../ui/BranchesToolbar';
import { BranchesPrintView } from './BranchesPrintView';
import { BranchesTable } from './BranchesTable';
import { AddBranchDialog } from './dialogs/AddBranchDialog';

type PrintSnapshot = {
  branches: Branch[];
  generatedAt: Date;
};

const PRINT_ERROR_MESSAGE = 'آماده‌سازی گزارش چاپ با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

export function BranchesPage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const { status, search, setStatus, setSearch } = useBranchFilters();

  const { state, refresh } = useBranches({ ...queryParams, search, status });

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
  const errorMessage =
    state.status === 'error'
      ? 'دریافت فهرست شعب با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
      : undefined;

  async function handleCreate(input: CreateBranchInput) {
    await createBranch(input);
    refresh();
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

  const handleStatusChange = useCallback(
    (nextStatus: string) => {
      setStatus(nextStatus);
    },
    [setStatus],
  );

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
          search={search}
          onSearchChange={setSearch}
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
