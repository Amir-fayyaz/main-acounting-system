'use client';

import { Printer } from 'lucide-react';

import { Button } from '@repo/web/ui';

export function PrintButton() {
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
