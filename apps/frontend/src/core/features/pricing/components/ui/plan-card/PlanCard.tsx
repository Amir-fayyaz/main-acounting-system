import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { Button } from '@/core/components/shadcn/ui/button/button';
import { Card, CardContent, CardHeader } from '@/core/components/shadcn/ui/card/card';
import type { BillingPeriod, Plan } from '@/core/features/pricing/assets/@types/pricing';
import { getBilledLabel, getMonthlyPrice, getPlanHref } from '@/core/features/pricing/lib/pricing';
import { formatPersianNumber } from '@/core/features/pricing/utils/formatPersianNumber';
import { H2, P } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

const ctaVariantClass: Record<Plan['id'], string> = {
  starter:
    'border border-[#d8d2c5] bg-transparent text-[#1a120a] shadow-none hover:bg-white hover:text-[#1a120a] hover:scale-100 active:scale-100',
  growth:
    'border-0 bg-[#ffa00a] text-[#1a120a] shadow-none hover:bg-[#ef8f00] hover:text-[#1a120a] hover:scale-100 active:scale-100',
  pro: 'border border-[#d8d2c5] bg-transparent text-[#1a120a] shadow-none hover:bg-white hover:text-[#1a120a] hover:scale-100 active:scale-100',
  enterprise:
    'border-0 bg-[#1a120a] text-white shadow-none hover:bg-[#3b2b1b] hover:text-white hover:scale-100 active:scale-100',
};

export function PlanCard({ plan, period }: { plan: Plan; period: BillingPeriod }) {
  const titleId = `plan-${plan.id}-title`;
  const isCustom = plan.kind === 'custom';
  const priceLabel =
    plan.kind === 'custom'
      ? plan.priceLabel
      : formatPersianNumber(getMonthlyPrice(plan.monthlyPrice, period));
  const billedLabel =
    plan.kind === 'custom' ? plan.billedLabel : getBilledLabel(plan.monthlyPrice, period);
  const href = plan.kind === 'custom' ? '/contact?topic=sales' : getPlanHref(plan.id, period);

  return (
    <Card
      aria-labelledby={titleId}
      className={cn(
        'flex w-full min-w-0 flex-col gap-0 rounded-[13px] border border-[#dfd6c5] bg-[#fffdf7] p-[25px_21px] shadow-none',
        'max-[1100px]:p-[23px_17px] max-[600px]:p-[25px] max-[900px]:p-[25px]',
        plan.featured &&
          'border-2 border-[#ffa00a] bg-[#fffbef] p-[24px_20px] max-[1100px]:p-[22px_16px] max-[600px]:p-6 max-[900px]:p-6',
      )}
    >
      <CardHeader className="block gap-0 p-0">
        <Badge
          variant="outline"
          className="mb-2 min-h-5 w-fit gap-[5px] rounded-none border-0 bg-transparent px-0 py-0 text-[10px] leading-[1.9] font-normal whitespace-normal text-[#93600f]"
        >
          {plan.featured ? (
            <Sparkles aria-hidden="true" strokeWidth={1.7} className="size-3 shrink-0" />
          ) : null}
          {plan.tag}
        </Badge>

        <H2
          id={titleId}
          className="mt-0 mb-[5px] text-[23px] leading-[1.7] font-bold tracking-[-0.5px] max-[600px]:text-[25px]"
        >
          {plan.name}
        </H2>

        <P className="min-h-[47px] text-[11px] leading-[2] text-[#746b60] max-[1050px]:min-h-[42px] max-[600px]:min-h-0 max-[600px]:text-xs">
          {plan.description}
        </P>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-0">
        <P
          className={cn(
            'mt-6 text-[28px] leading-[1.7] font-extrabold tracking-[-0.8px] whitespace-nowrap max-[1100px]:text-[24px] max-[600px]:mt-[19px] max-[600px]:text-[34px] max-[900px]:text-[29px]',
            isCustom && 'text-[27px] max-[1100px]:text-[23px] max-[600px]:text-[30px]',
          )}
        >
          {priceLabel}
        </P>

        <P className="mt-[3px] text-[10px] text-[#7b6b51] max-[600px]:text-[11px]">
          {isCustom ? plan.unitLabel : 'تومان در ماه'}
        </P>

        <P className="mt-2 min-h-[35px] text-[9px] leading-[1.9] text-[#7e6e54] max-[600px]:mt-[7px] max-[600px]:min-h-0 max-[600px]:text-[10px]">
          {billedLabel}
        </P>

        <Button
          asChild
          className={cn(
            'mt-5 min-h-[43px] gap-[10px] rounded-[8px] px-2.5 text-[11px] leading-[1.6] font-[650] whitespace-nowrap max-[600px]:mt-5 max-[600px]:min-h-[45px] max-[600px]:text-xs [&_svg]:size-[19px]',
            ctaVariantClass[plan.id],
          )}
        >
          <Link href={href}>
            {plan.ctaLabel}
            <ArrowLeft aria-hidden="true" strokeWidth={1.7} />
          </Link>
        </Button>

        <ul className="mt-[23px] flex list-none flex-col gap-3 border-t border-[#e6ddcb] p-0 pt-[19px] max-[600px]:mt-[22px] max-[600px]:pt-[19px]">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-[7px] text-[11px] leading-[1.9] max-[1100px]:text-[10px] max-[600px]:text-xs max-[900px]:text-xs"
            >
              <Check
                aria-hidden="true"
                strokeWidth={1.7}
                className="mt-[3px] size-[14px] shrink-0 text-[#9b7026]"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
