'use client';

import { useEffect, useState } from 'react';
import { usePagination } from '@repo/web';
import { Button, H1, P, SectionLayout } from '@repo/web';
import { Plus, Printer } from 'lucide-react';
import { toast } from 'sonner';

import type { CreateUserInput, User } from '../../assets/@types/user';
import { createUser, listAllUsers } from '../../lib/users.service';
import { useUsers } from '../../hook/useUsers';
import { useUserFilters } from '../../hook/useUserFilters';
import { UsersToolbar } from '../ui/UsersToolbar';
import { UsersTable } from './UsersTable';
import { UsersPrintView } from './UsersPrintView';
import { AddUserDialog } from './dialogs/AddUserDialog';

type PrintSnapshot = {
  users: User[];
  generatedAt: Date;
};

const PRINT_ERROR_MESSAGE = 'آماده‌سازی گزارش چاپ با مشکل مواجه شد. لطفاً دوباره تلاش کنید.';

export function UsersPage() {
  const { page, limit, setPage, setLimit, queryParams } = usePagination();
  const { role, search, setRole, setSearch } = useUserFilters();

  const { state, refresh } = useUsers({ ...queryParams, search, role });

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
      ? 'دریافت فهرست کاربران با مشکل مواجه شد. لطفاً دوباره تلاش کنید.'
      : undefined;

  async function handleCreate(input: CreateUserInput) {
    await createUser(input);
    refresh();
  }

  async function handlePrint() {
    if (isPreparingPrint) return;

    setIsPreparingPrint(true);
    try {
      const users = await listAllUsers({ search, role });
      setPrintSnapshot({ users, generatedAt: new Date() });
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
          <H1 className="text-start text-xl font-bold sm:text-2xl">کاربران و نقش‌ها</H1>
          <P className="text-sm text-muted-foreground">عضویت‌ها و دسترسی‌ها</P>
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
            کاربر جدید
          </Button>
        </div>
      </div>

      <UsersToolbar value={role} onChange={setRole} className="print:hidden" />

      <div className="print:hidden">
        <UsersTable
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
        <UsersPrintView users={printSnapshot.users} generatedAt={printSnapshot.generatedAt} />
      ) : null}

      <AddUserDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreate={handleCreate} />
    </SectionLayout>
  );
}
