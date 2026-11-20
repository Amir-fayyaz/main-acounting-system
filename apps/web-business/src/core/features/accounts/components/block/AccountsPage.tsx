import { Suspense } from 'react';

import { H1, Muted, SectionLayout } from '@repo/web/ui';

import { AccountsPageContent } from './AccountsPageContent';

function AccountsPageFallback() {
  return (
    <SectionLayout>
      <div className="flex flex-col gap-5" role="status" aria-live="polite">
        <header className="space-y-1">
          <H1 className="text-start text-xl font-bold tracking-tight sm:text-2xl">بانک و صندوق</H1>
          <Muted className="text-start text-xs leading-6 sm:text-sm">
            حساب‌های بانکی، صندوق‌ها و تنخواه با موجودی
          </Muted>
        </header>

        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          در حال بارگذاری حساب‌ها…
        </div>
      </div>
    </SectionLayout>
  );
}

export function AccountsPage() {
  return (
    <Suspense fallback={<AccountsPageFallback />}>
      <AccountsPageContent />
    </Suspense>
  );
}
