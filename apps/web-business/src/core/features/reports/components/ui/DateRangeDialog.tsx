'use client';

import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
} from '@repo/web/ui';

export type DateRangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: (range: { from: string; to: string }) => void;
};

export function DateRangeDialog({ open, onOpenChange, onConfirm }: DateRangeDialogProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="link">
          انتخاب بازه تاریخ
        </button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>بازه تاریخ گزارش</DialogTitle>
          <DialogDescription>بازه زمانی مورد نظر برای گزارش را انتخاب کنید.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">از تاریخ</label>
            <Input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="۱۴۰۵/۰۱/۰۱"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">تا تاریخ</label>
            <Input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="۱۴۰۵/۱۲/۲۹"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm?.({ from, to });
              onOpenChange(false);
            }}
          >
            اعمال
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
