import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, H2 } from '@repo/web/ui';

export function ListCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="gap-4 rounded-lg">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <H2 className="text-[15px] font-bold">{title}</H2>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
