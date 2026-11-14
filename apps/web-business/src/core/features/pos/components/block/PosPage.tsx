import { Suspense } from 'react';

import { H1, Muted, SectionLayout } from '@repo/web/ui';

import { PosPageContent } from './PosPageContent';

function PosPageFallback() {
  return (
    <SectionLayout>
      <div className="flex flex-col gap-5" role="status" aria-live="polite">
        <header className="space-y-1">
          <H1 className="text-start text-xl font-bold tracking-tight sm:text-2xl">
            دستگاه‌های POS
          </H1>
          <Muted className="text-start text-xs leading-6 sm:text-sm">
            ترمینال‌ها، پذیرنده‌ها و حساب مقصد تسویه
          </Muted>
        </header>

        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          در حال بارگذاری دستگاه‌ها…
        </div>
      </div>
    </SectionLayout>
  );
}

/**
 * صفحه‌ی دستگاه‌های POS؛ مرز Suspense برای useSearchParams در App Router.
 * صفحه‌ی مسیر فقط این کامپوننت را رندر می‌کند.
 */
export function PosPage() {
  return (
    <Suspense fallback={<PosPageFallback />}>
      <PosPageContent />
    </Suspense>
  );
}
