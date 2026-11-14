import { Suspense } from 'react';

import { H1, Muted, SectionLayout } from '@repo/web/ui';

import { ChecksPageContent } from './ChecksPageContent';

function ChecksPageFallback() {
  return (
    <SectionLayout>
      <div className="flex flex-col gap-5" role="status" aria-live="polite">
        <header className="space-y-1">
          <H1 className="text-start text-xl font-bold tracking-tight sm:text-2xl">چک‌ها</H1>
          <Muted className="text-start text-xs leading-6 sm:text-sm">
            چک‌های دریافتی و پرداختی با شماره چک و شناسه صیادی
          </Muted>
        </header>

        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          در حال بارگذاری چک‌ها…
        </div>
      </div>
    </SectionLayout>
  );
}

/**
 * صفحه‌ی چک‌ها؛ مرز Suspense برای useSearchParams در App Router.
 * صفحه‌ی مسیر فقط این کامپوننت را رندر می‌کند.
 */
export function ChecksPage() {
  return (
    <Suspense fallback={<ChecksPageFallback />}>
      <ChecksPageContent />
    </Suspense>
  );
}
