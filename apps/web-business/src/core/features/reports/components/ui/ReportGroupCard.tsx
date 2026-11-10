'use client';

import { Card, CardContent, CardHeader } from '@repo/web/ui';
import { CiCalculator1, CiBank, CiShoppingCart, CiFileOn } from 'react-icons/ci';

import type { ReportGroup } from '../../assets/@types/reports';

const CARD_TITLE_CLASS = 'text-[15px] font-bold';

const ICON_MAP: Record<string, React.ElementType> = {
  CiCalculator1,
  CiBank,
  CiShoppingCart,
  CiFileOn,
};

function ReportGroupIcon({ iconName }: { iconName: string }) {
  const Icon = ICON_MAP[iconName];
  if (!Icon) return null;
  return <Icon className="size-4 text-muted-foreground" />;
}

export function ReportGroupCard({ group }: { group: ReportGroup }) {
  return (
    <Card className="gap-4 rounded-lg border border-border hover:border-brand/30 transition-colors cursor-pointer">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ReportGroupIcon iconName={group.icon} />
            <h2 className={CARD_TITLE_CLASS}>{group.title}</h2>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{group.description}</p>
      </CardContent>
    </Card>
  );
}
