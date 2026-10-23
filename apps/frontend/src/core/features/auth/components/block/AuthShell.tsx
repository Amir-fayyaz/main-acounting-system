import { Span } from '@/core/components/custom/ui/typography/Typography';
import { ArrowRight, House } from 'lucide-react';
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
          <Link href="/" className="flex items-center gap-2.5">
            <Span className="bg-primary text-ink shadow-brand-dark/40 grid size-9.5 place-items-center rounded-xl shadow-lg text-xl font-extrabold">
              <House className="size-5.5" strokeWidth={2.4} aria-hidden="true" />
            </Span>
            <Span className="text-xl font-extrabold">مین‌حساب</Span>
          </Link>

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
