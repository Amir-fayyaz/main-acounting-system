'use client';

import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/web';
import { cn } from '@repo/web/ui/utils/cn';

export type SettingsCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function SettingsCard({ title, children, className }: SettingsCardProps) {
  return (
    <Card className={cn('gap-4', className)}>
      <CardHeader>
        <CardTitle className="text-base font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
