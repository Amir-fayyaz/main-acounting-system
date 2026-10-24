import type { BenefitItem } from '@/core/features/landing/assets/mock/workspace';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { Small, Span } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

export function BenefitsList({
  items,
  className,
  itemClassName,
  descriptionClassName,
}: {
  items: readonly BenefitItem[];
  className?: string;
  itemClassName?: string;
  descriptionClassName?: string;
}) {
  return (
    <ul className={cn('my-6 mb-5 flex list-none flex-col gap-4 p-0', className)}>
      {items.map((item) => (
        <li
          key={item.title}
          className={cn('flex items-start gap-2.5 text-[13px] font-[650]', itemClassName)}
        >
          <Span className="mt-[3px] inline-flex size-[21px] shrink-0 items-center justify-center rounded-full bg-[#e7f4ed] text-[#28765b]">
            <LandingIcon name="check" className="size-[13px]" />
          </Span>

          <div>
            {item.title}
            <Small
              className={cn(
                'mt-[3px] block text-[11px] font-normal text-[#746b60]',
                descriptionClassName,
              )}
            >
              {item.description}
            </Small>
          </div>
        </li>
      ))}
    </ul>
  );
}
