import { Badge, Card, P, Small, Span } from '@repo/web/ui';

import type { DashboardData } from '@/core/features/landing/assets/@types/dashboard';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';

export function DashboardTasks({ data }: { data: DashboardData }) {
  return (
    <Card className="gap-0 rounded-lg border border-border bg-card p-3.5 shadow-none max-sm:hidden max-md:p-2.5">
      <div className="flex justify-between gap-1.5 text-xs font-semibold">
        <Span className="text-xs! font-semibold!">{data.tasksTitle}</Span>
        <Small className="text-xs! font-normal! text-muted-foreground">{data.tasksCount}</Small>
      </div>

      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {data.tasks.map((task) => (
          <li
            key={task.title}
            className="flex items-center gap-1.5 border-b border-sand pb-2 text-xs last:border-0 last:pb-0"
          >
            <Span className="text-[length:inherit] grid! size-7 place-items-center rounded-md border border-border bg-background text-brand-link!">
              <LandingIcon name={task.icon} className="size-3.5" />
            </Span>

            <div>
              <Span className="text-xs!">{task.title}</Span>
              <P className="mt-px text-xs! text-muted-foreground">{task.description}</P>
            </div>

            <Badge className="mr-auto bg-accent py-0.5 px-1 text-xs max-md:hidden">
              <Span className="text-[length:inherit]">{task.badge}</Span>
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
