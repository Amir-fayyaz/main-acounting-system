'use client';

import { Button } from '@/core/components/shadcn/ui/button/button';
import { Input } from '@/core/components/shadcn/ui/input/input';
import { cn } from '@/core/utils/shadcn/utils';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        // pe-12: جا برای دکمه‌ی نمایش رمز (آخرین کلاس تا بر px کلاس‌های ورودی غلبه کند)
        className={cn(className, 'pe-12')}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'پنهان کردن رمز' : 'نمایش رمز'}
        aria-pressed={visible}
        className="text-muted-foreground hover:bg-muted absolute end-2 top-1/2 -translate-y-1/2 rounded-lg"
      >
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </Button>
    </div>
  );
}
