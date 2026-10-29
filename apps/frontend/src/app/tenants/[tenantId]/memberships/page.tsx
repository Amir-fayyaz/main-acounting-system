import { Suspense } from 'react';

import { MembershipsTable } from './MembershipsTable';

type MembershipsPageProps = {
  params: Promise<{ tenantId: string }>;
};

export default async function MembershipsPage({ params }: MembershipsPageProps) {
  const { tenantId } = await params;

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
        <MembershipsTable tenantId={tenantId} />
      </Suspense>
    </main>
  );
}
