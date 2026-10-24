import { cn } from '@/core/utils/shadcn/utils';
import Link from 'next/link';
import type { ComponentProps } from 'react';

/** لینک متنی صفحات auth (رنگ از توکن `brand-link`) */
export function AuthLink({ className, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
    //  هرکار کردم text-brand-dark توی خروجی کلاس ها ایجاد نمیشد
      className={cn('font-semibold text-brand-dark', className)}
      {...props}
    />
  );
}
