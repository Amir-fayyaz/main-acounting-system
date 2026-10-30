'use client';

import '@repo/web/styles/globals.css';
import { rubik } from '@/core/assets/style/fonts/font';
import { ErrorPresentation } from '@repo/web/ui';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`flex min-h-screen items-center justify-center ${rubik.variable} bg-background text-foreground font-sans`}>
        <ErrorPresentation type={500} retry={reset} onHome={() => window.location.assign('/')} />
      </body>
    </html>
  );
}
