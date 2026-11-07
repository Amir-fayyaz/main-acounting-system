'use client';

import { Button } from '@repo/web/ui/components/shadcn/ui/button/button';
import { H1, P } from '@repo/web/ui/components/custom/ui/typography/Typography';
import { Plus } from 'lucide-react';

interface UsersToolbarProps {
  title: string;
  subtitle?: string;
  onCreateUser?: () => void;
  userCount?: number;
}

export function UsersToolbar({
  title,
  subtitle,
  onCreateUser,
  userCount,
}: UsersToolbarProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <H1 className="text-start text-xl font-bold sm:text-2xl">{title}</H1>
          {subtitle && (
            <P className="text-sm text-muted-foreground mt-1">{subtitle}</P>
          )}
        </div>
        <div className="flex items-center gap-3">
          {userCount !== undefined && (
            <span className="text-sm text-muted-foreground">
              {userCount.toLocaleString('fa-IR')} کاربر
            </span>
          )}
          {onCreateUser && (
            <Button onClick={onCreateUser}>
              <Plus className="size-4" aria-hidden="true" />
              <span className="ml-2">کاربر جدید</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
