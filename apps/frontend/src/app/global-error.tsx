'use client';

import './globals.css';
import { rubik, vazirmatn } from '@/core/assets/style/fonts/font';
import { ErrorPresentation } from '@repo/web/ui';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body
        className={`flex min-h-screen items-center justify-center ${rubik.variable} ${vazirmatn.variable} bg-background text-foreground font-sans`}
      >
        <ErrorPresentation type={500} retry={reset} />
      </body>
    </html>
  );
}
