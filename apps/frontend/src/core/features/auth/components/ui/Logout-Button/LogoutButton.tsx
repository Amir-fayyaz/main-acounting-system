'use client';

import { Button } from '@/core/components/shadcn/ui/button/button';
import { LogOut } from 'lucide-react';
import { useSignOut } from '../../../hook/useSignOut';

type LogoutButtonProps = {
  className?: string;
  /** متن دکمه؛ پیش‌فرض: خروج */
  label?: string;
};

/** دکمه خروج: API sign-out + پاک کردن cookie + ریدایرکت /login */
export function LogoutButton({ className, label = 'خروج' }: LogoutButtonProps) {
  const { signOut, loading } = useSignOut();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      onClick={() => void signOut()}
      className={className}
      aria-busy={loading}
    >
      <LogOut className="size-4" aria-hidden="true" />
      {loading ? 'در حال خروج...' : label}
    </Button>
  );
}
