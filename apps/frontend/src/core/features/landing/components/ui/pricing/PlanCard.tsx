import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';

import { Badge, Button, Card, CardContent, CardHeader, H2, P, Span } from '@repo/web/ui';

import type { BillingPeriod, Plan } from '@/core/features/landing/assets/@types/pricing';
import { getBilledLabel, getMonthlyPrice, getPlanHref } from '@/core/features/landing/lib/pricing';
import { formatPersianNumber } from '@/core/features/landing/utils/formatPersianNumber';
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
        'flex w-full min-w-0 flex-col gap-0 rounded-xl border border-[#dfd6c5] bg-[#fffdf7] py-6 px-5 shadow-none',
        'max-xl:py-6 max-xl:px-4 max-sm:p-6 max-lg:p-6',
        plan.featured &&
          'border-2 border-[#ffa00a] bg-[#fffbef] py-6 px-5 max-xl:py-5 max-xl:px-4 max-sm:p-6 max-lg:p-6',
      )}
    >
      <CardHeader className="block gap-0 p-0">
        <Badge
          variant="outline"
          className="mb-2 min-h-5 w-fit gap-1 rounded-none border-0 bg-transparent px-0 py-0 text-xs leading-loose font-normal whitespace-normal text-[#93600f]"
        >
          {plan.featured ? (
            <Sparkles aria-hidden="true" strokeWidth={1.7} className="size-3 shrink-0" />
          ) : null}
          <Span className="text-[length:inherit]">{plan.tag}</Span>
        </Badge>

        <H2 id={titleId} className="mt-0 mb-1 text-2xl leading-relaxed font-bold tracking-tight">
          {plan.name}
        </H2>

        <P className="min-h-12 text-xs leading-loose text-[#746b60] max-xl:min-h-10 max-sm:min-h-0">
          {plan.description}
        </P>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-0">
        <P
          className={cn(
            'mt-6 text-3xl leading-relaxed font-extrabold tracking-tight whitespace-nowrap max-xl:text-2xl max-sm:mt-5 max-sm:text-4xl',
            isCustom && 'text-2xl max-sm:text-3xl',
          )}
        >
          {priceLabel}
        </P>

        <P className="mt-0.5 text-xs text-[#7b6b51]">
          {isCustom ? plan.unitLabel : 'تومان در ماه'}
        </P>

        <P className="mt-2 min-h-9 text-xs leading-loose text-[#7e6e54] max-sm:mt-1.5 max-sm:min-h-0">
          {billedLabel}
        </P>

        <Button
          asChild
          className={cn(
            'mt-5 min-h-11 gap-2.5 rounded-lg px-2.5 text-xs leading-relaxed font-semibold whitespace-nowrap [&_svg]:size-5',
            ctaVariantClass[plan.id],
          )}
        >
          <Link href={href}>
            <Span className="text-[length:inherit]">{plan.ctaLabel}</Span>
            <ArrowLeft aria-hidden="true" strokeWidth={1.7} />
          </Link>
        </Button>

        <ul className="mt-6 flex list-none flex-col gap-3 border-t border-[#e6ddcb] p-0 pt-5 max-sm:mt-5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-1.5 text-xs leading-loose">
              <Check
                aria-hidden="true"
                strokeWidth={1.7}
                className="mt-0.5 size-3.5 shrink-0 text-[#9b7026]"
              />
              <Span className="text-[length:inherit]">{feature}</Span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
