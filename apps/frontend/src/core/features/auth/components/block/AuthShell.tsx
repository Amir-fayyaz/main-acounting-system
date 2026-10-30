import { SiteBrand } from '@/core/components/custom/ui/brand/SiteBrand';
import { Span } from '@repo/web/ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LedgerPanel } from '../ui/Ledger-Panel/LedgerPanel';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="bg-background text-foreground grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col px-5 py-5 sm:px-10 sm:py-7">
        <header className="flex items-center justify-between">
          <SiteBrand />

          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Span className="text-sm">بازگشت به سایت</Span>
            <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
          </Link>
        </header>

        <div className="m-auto w-full max-w-105 py-8">{children}</div>
      </section>

      <LedgerPanel title={title} subtitle={subtitle} />
    </main>
  );
}
