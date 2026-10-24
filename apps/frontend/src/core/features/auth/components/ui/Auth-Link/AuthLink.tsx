import { cn } from '@/core/utils/shadcn/utils';
import Link from 'next/link';
import type { ComponentProps } from 'react';

/** لینک متنی صفحات auth (رنگ از توکن `brand-link`) */
export function AuthLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn('text-brand-link font-semibold underline-offset-4 hover:underline', className)}
      {...props}
    />
  );
}
