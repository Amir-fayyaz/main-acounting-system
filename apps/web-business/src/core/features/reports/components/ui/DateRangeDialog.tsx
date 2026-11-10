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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/web/ui';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import type { ReportDateRange } from '../../assets/@types/reports';
import { branches, statuses } from '../../assets/mock/reports';

export type DateRangeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportLabel: string;
  onConfirm?: (range: ReportDateRange) => void;
};

export function DateRangeDialog({
  open,
  onOpenChange,
  reportLabel,
  onConfirm,
}: DateRangeDialogProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [branch, setBranch] = useState('همه شعب');
  const [status, setStatus] = useState('همه');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className="link">
          باز کردن گزارش
        </button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{reportLabel}</DialogTitle>
          <DialogDescription>پارامترهای گزارش را مشخص کنید.</DialogDescription>
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
          <div className="space-y-2">
            <label className="text-sm font-medium">شعبه</label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">وضعیت</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <menu className="flex flex-wrap gap-2 justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                بستن
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                toast('نسخه نمایشی: گزارش به بک‌اند وصل می‌شود');
                onOpenChange(false);
              }}
            >
              <Download className="size-4" aria-hidden="true" /> Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                toast('نسخه نمایشی: گزارش به بک‌اند وصل می‌شود');
                onOpenChange(false);
              }}
            >
              <Download className="size-4" aria-hidden="true" /> PDF
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                toast('نسخه نمایشی: گزارش به بک‌اند وصل می‌شود');
                onConfirm?.({ from, to });
                onOpenChange(false);
              }}
            >
              نمایش گزارش
            </Button>
          </menu>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
