'use client';

import { Printer } from 'lucide-react';

import { Button } from '@repo/web/ui';

/** دکمه‌ی چاپ فهرست حساب‌ها؛ خروجی چاپ با استایل اختصاصی صفحه کنترل می‌شود. */
export function AccountPrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="gap-1.5"
      onClick={() => {
        window.print();
      }}
    >
      <Printer className="size-4" aria-hidden />
      چاپ
    </Button>
  );
}
