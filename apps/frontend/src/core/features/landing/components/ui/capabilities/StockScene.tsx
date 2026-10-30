import { Card, Small, Span } from '@repo/web/ui';

import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import type { CSSProperties } from 'react';

const stockLines = [
  { code: '۰۰۱', name: 'قطعه صنعتی A', quantity: '۸۴', fill: '78%' },
  { code: '۰۰۲', name: 'بسته اتصالات', quantity: '۵۶', fill: '55%' },
  { code: '۰۰۳', name: 'تجهیزات جانبی', quantity: '۳۲', fill: '34%' },
];

export function StockScene() {
  return (
    <div className="relative mx-7 mt-5 mb-7 max-w-96 max-xl:mx-6 max-md:mt-6 max-md:mx-7 max-md:mb-7 max-md:max-w-none max-lg:mx-5">
      {stockLines.map((line) => (
        <Card
          key={line.code}
          className="relative flex! flex-row! items-center! gap-2.5! rounded-md! border-brand-dark! bg-background! py-2.5! px-3! text-[length:inherit]! shadow-[0_3px_0_color-mix(in_srgb,var(--primary)_25%,transparent)]! text-xs max-md:py-3! max-md:px-3.5! max-lg:gap-1.5! max-lg:p-2.5! [&+&]:mr-3.5 [&+&]:mt-2 [&:last-child]:mr-7 max-md:[&+&]:mr-3.5 max-md:[&:last-child]:mr-7 max-lg:[&+&]:mr-2 max-lg:[&:last-child]:mr-4 [&>svg]:size-5 [&>svg]:text-brand-link max-md:[&>svg]:size-5 max-lg:[&>svg]:size-4"
        >
          <LandingIcon name="box" />

          <div>
            <Span className="block text-xs font-semibold">{line.name}</Span>

            <Small className="block! text-xs! font-normal! leading-relaxed! text-muted-foreground!">
              انبار مرکزی · کد {line.code}
            </Small>

            <div
              className="mt-1.5 h-1 w-12 overflow-hidden rounded-sm bg-border before:block before:h-1 before:w-(--fill) before:rounded-sm before:bg-chart-4 before:content-[''] max-md:w-20"
              style={{ '--fill': line.fill } as CSSProperties}
            />
          </div>

          <Span className="mr-auto! text-sm! font-bold! whitespace-nowrap! max-lg:text-xs!">
            {line.quantity}

            <Small className="block! text-left! text-xs! font-normal!">واحد موجود</Small>
          </Span>
        </Card>
      ))}
    </div>
  );
}
