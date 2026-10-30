'use client';

import '@repo/web/styles/globals.css';
import { ErrorPresentation } from '@repo/web/ui';

export default function GlobalNotFound() {
  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <ErrorPresentation type={404} />
      </body>
    </html>
  );
}
