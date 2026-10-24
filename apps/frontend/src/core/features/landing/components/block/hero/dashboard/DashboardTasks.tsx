import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { Card } from '@/core/components/shadcn/ui/card/card';
import type { DashboardData } from '@/core/features/landing/assets/@types/dashboard';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { P, Small, Span } from '@repo/web/ui';

export function DashboardTasks({ data }: { data: DashboardData }) {
  return (
    <Card className="gap-0 rounded-[8px] border border-[#e8e4db] bg-white p-[14px] shadow-none max-[600px]:hidden max-[800px]:p-[11px]">
      <div className="flex justify-between gap-[7px] text-[11px] font-[650] max-[600px]:text-[10px]">
        <Span className="!text-[11px] !font-[650] max-[600px]:!text-[10px]">{data.tasksTitle}</Span>
        <Small className="!text-[9px] !font-normal text-[#746b60] max-[600px]:!text-[8px]">
          {data.tasksCount}
        </Small>
      </div>

      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {data.tasks.map((task) => (
          <li
            key={task.title}
            className="flex items-center gap-[7px] border-b border-[#efede7] pb-2 text-[10px] last:border-0 last:pb-0"
          >
            <Span className="!grid size-7 place-items-center rounded-[6px] border border-[#eee7da] bg-[#faf8f2] !text-[#a56700]">
              <LandingIcon name={task.icon} className="size-3.5" />
            </Span>

            <div>
              <Span className="!text-[10px]">{task.title}</Span>
              <P className="mt-[1px] !text-[9px] text-[#746b60]">{task.description}</P>
            </div>

            <Badge className="mr-auto bg-[#fff1d9] p-[2px_5px] text-[8px] max-[800px]:hidden">
              {task.badge}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
