'use client';

import { Button } from '@repo/web/ui';
import { LogOut } from 'lucide-react';
import { useSignOut } from '../hooks';

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

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