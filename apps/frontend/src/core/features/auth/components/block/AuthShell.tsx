import { Span } from "@/core/components/custom/ui/typography/Typography";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LedgerPanel } from "../ui/LedgerPanel";

/** layout دو ستونه: ستون فرم (brand + بازگشت + کارت) و پنل ledger */
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
    <div className="bg-background text-foreground grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-5 py-5 sm:px-10 sm:py-7">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold">
            <span className="bg-primary grid size-[38px] place-items-center rounded-[11px] shadow-[0_6px_16px_-6px_#ef8f00]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1a120a"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[22px]"
                aria-hidden="true"
              >
                <path d="M4 19V9l8-5 8 5v10" />
                <path d="M9 19v-6h6v6" />
              </svg>
            </span>
            مین‌حساب
          </Link>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
          >
            <Span className="text-sm">بازگشت به سایت</Span>
            <ArrowRight className="size-4 rotate-180" aria-hidden="true" />
          </Link>
        </header>
        <main className="m-auto w-full max-w-[420px] py-8">{children}</main>
      </div>
      <LedgerPanel title={title} subtitle={subtitle} />
    </div>
  );
}
