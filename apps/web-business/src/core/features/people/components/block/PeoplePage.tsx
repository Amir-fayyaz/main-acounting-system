'use client';

import { useState } from 'react';
import { usePagination } from '@repo/web';
import { Button, H1, P, SectionLayout } from '@repo/web';
import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import type { CreatePersonInput } from '../../assets/@types/person';
import { createPerson } from '../../lib/people.service';
import { usePeople } from '../../hook/usePeople';
import { usePeopleFilters } from '../../hook/usePeopleFilters';
import { PeopleToolbar } from '../ui/PeopleToolbar';
import { PeopleTable } from './PeopleTable';
import { AddPersonDialog } from './dialogs/AddPersonDialog';

export function PeoplePage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const searchParams = useSearchParams();
  const { kind, setKind } = usePeopleFilters();

  const search = searchParams.get('search') ?? '';

  const { state, refresh } = usePeople({ ...queryParams, search, kind });

  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleKindChange = (nextKind: string) => {
    setKind(nextKind);
  };

  return (
    <SectionLayout>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <H1 className="text-start text-xl font-bold sm:text-2xl">مشتریان و تأمین‌کنندگان</H1>
          <P className="text-sm text-muted-foreground">مانده حساب هر شخص</P>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            شخص جدید
          </Button>
        </div>
      </div>

      <PeopleToolbar kind={kind} onKindChange={handleKindChange} />

      <PeopleTable
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

      <AddPersonDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </SectionLayout>
  );
}
