import { Small, Span } from '@repo/web/ui';
import type { BenefitItem } from '@/core/features/landing/assets/mock/workspace';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
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
          className={cn('flex items-start gap-2.5 text-xs font-semibold', itemClassName)}
        >
          <Span className="text-[length:inherit] mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e7f4ed] text-[#28765b]">
            <LandingIcon name="check" className="size-3" />
          </Span>

          <div>
            <Span className="text-[length:inherit]">{item.title}</Span>
            <Small
              className={cn(
                'mt-0.5 block text-xs font-normal text-[#746b60]',
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
