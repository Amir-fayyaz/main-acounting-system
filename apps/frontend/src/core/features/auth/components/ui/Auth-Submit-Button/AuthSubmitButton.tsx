import { Button } from '@repo/web/ui';
import { LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type AuthSubmitButtonProps = {
  children: ReactNode;
  loading?: boolean;
  /** متن حین loading؛ اگر نباشد همان children نمایش داده می‌شود */
  loadingLabel?: string;
};

/** دکمه‌ی submit فرم‌های auth (حالت loading + غیرفعال‌شدن) */
export function AuthSubmitButton({
  children,
  loading = false,
  loadingLabel,
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="h-12 w-full rounded-xl text-base font-semibold"
    >
      {loading && <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />}
      {loading && loadingLabel ? loadingLabel : children}
    </Button>
  );
}
