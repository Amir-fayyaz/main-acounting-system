'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@repo/web/ui';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/web/ui/components/shadcn/ui/dialog/dialog';
import { useSignOut } from '@/core/features/auth/hook/useSignOut';

export function PanelLogoutControl() {
  const [open, setOpen] = useState(false);
  const { signOut, loading } = useSignOut();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="خروج"
          title="خروج"
          className="grid size-[38px] shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground group-data-[collapsible=icon]:hidden"
        >
          <LogOut className="size-5" aria-hidden="true" />
        </button>
      </DialogTrigger>

      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>خروج از حساب کاربری</DialogTitle>
          <DialogDescription>
            آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={loading}>
              انصراف
            </Button>
          </DialogClose>

          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            aria-busy={loading}
            onClick={() => void signOut()}
          >
            {loading ? 'در حال خروج...' : 'بله، خارج شو'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
