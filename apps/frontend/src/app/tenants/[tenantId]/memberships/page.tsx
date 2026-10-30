import { Suspense } from 'react';

import { MembershipsView } from '@/core/features/tenant-memberships/components/block/MembershipsView';
import { getTenantMemberships } from '@/core/features/tenant-memberships/lib/memberships-api';
import { DEFAULT_LIMIT, parsePaginationParams } from '@repo/web/ui/utils/pagination';

type MembershipsPageProps = {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function MembershipsPage({ params, searchParams }: MembershipsPageProps) {
  const { tenantId } = await params;
  const sp = await searchParams;

  const { page, limit } = parsePaginationParams(
    {
      page: firstString(sp.page),
      limit: firstString(sp.limit),
    },
    { defaultLimit: DEFAULT_LIMIT },
  );

  const initialResult = await getTenantMemberships(tenantId, page, limit);

  return (
    <main className="container mx-auto grid gap-6 px-4 py-8" dir="rtl">
      <header className="grid gap-2">
        <h1 className="text-2xl font-bold">اعضای مجموعه</h1>
        <p className="text-sm text-muted-foreground">
          فهرست اعضا و وضعیت عضویت آن‌ها در این مجموعه
        </p>
      </header>

      <Suspense
        fallback={
          <p role="status" className="py-8 text-center text-muted-foreground">
            در حال آماده‌سازی جدول…
          </p>
        }
      >
        <MembershipsView tenantId={tenantId} initialResult={initialResult} />
      </Suspense>
    </main>
  );
}
