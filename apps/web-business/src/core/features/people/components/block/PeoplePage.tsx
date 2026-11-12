'use client';

import { useEffect, useState } from 'react';
import { usePagination, type SortItem } from '@repo/web';
import { Button, H1, P, SectionLayout } from '@repo/web';
import { Plus, Printer } from 'lucide-react';
import { toast } from 'sonner';

import type { CreatePersonInput, Person } from '../../assets/@types/person';
import { createPerson, listAllPeople } from '../../lib/people.service';
import { usePeople } from '../../hook/usePeople';
import { usePeopleFilters } from '../../hook/usePeopleFilters';
import { PeopleToolbar } from '../ui/PeopleToolbar';
import { PeopleTable } from './PeopleTable';
import { PeoplePrintView } from './PeoplePrintView';
import { AddPersonDialog } from './dialogs/AddPersonDialog';

type PrintSnapshot = {
  people: Person[];
  generatedAt: Date;
};

const PRINT_ERROR_MESSAGE = 'آماده‌سازی گزارش چاپ با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

export function PeoplePage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const { kind, search, setKind, setSearch } = usePeopleFilters();
  const [sorting, setSorting] = useState<SortItem[]>([]);

  const { state, refresh } = usePeople({ ...queryParams, search, kind, sort: sorting });

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
      ? 'دریافت فهرست اشخاص با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
      : undefined;

  async function handleCreate(input: CreatePersonInput) {
    await createPerson(input);
    refresh();
  }

  async function handlePrint() {
    if (isPreparingPrint) return;

    setIsPreparingPrint(true);
    try {
      const people = await listAllPeople({ search, kind, sort: sorting });
      setPrintSnapshot({ people, generatedAt: new Date() });
    } catch {
      toast.error(PRINT_ERROR_MESSAGE);
    } finally {
      setIsPreparingPrint(false);
    }
  }

  const handleKindChange = (nextKind: string) => {
    setKind(nextKind);
  };

  return (
    <SectionLayout>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">مشتریان و تأمین‌کنندگان</H1>
          <P className="text-sm text-muted-foreground">مانده حساب هر شخص</P>
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
            شخص جدید
          </Button>
        </div>
      </div>

      <PeopleToolbar kind={kind} onKindChange={handleKindChange} className="print:hidden" />

      <div className="print:hidden">
        <PeopleTable
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
          sorting={sorting}
          onSortingChange={setSorting}
        />
      </div>

      {printSnapshot ? (
        <PeoplePrintView
          people={printSnapshot.people}
          generatedAt={printSnapshot.generatedAt}
        />
      ) : null}

      <AddPersonDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </SectionLayout>
  );
}
