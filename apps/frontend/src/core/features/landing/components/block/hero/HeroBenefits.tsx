import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { landingContainerClass } from '@/core/features/landing/lib/landing-classes';
import { Span } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

const benefits = [
  { label: 'طراحی‌شده برای حسابدار', icon: 'book' },
  { label: 'یک‌بار ورود، یک جریان داده', icon: 'link' },
  { label: 'هوش مصنوعی با تأیید شما', icon: 'shield' },
] as const;

const HeroBenefits = () => {
  return (
    <div className={landingContainerClass}>
      <div className="flex items-center justify-center gap-[35px] text-[12px] text-[#7b7061] max-[600px]:grid max-[600px]:grid-cols-2 max-[600px]:justify-items-center max-[600px]:gap-[11px] max-[600px]:text-[10px] max-[800px]:gap-5 max-[800px]:text-[11px]">
        {benefits.map((benefit, index) => (
          <Span
            key={benefit.label}
            className="!contents !text-[12px] max-[800px]:!text-[11px] max-[600px]:!text-[10px]"
          >
            {index > 0 ? (
              <i aria-hidden="true" className="h-[17px] w-px bg-[#dcd5c7] max-[600px]:hidden" />
            ) : null}

            <Span
              className={cn(
                '!flex items-center gap-[7px] !text-[12px]',
                'max-[800px]:!text-[11px] max-[600px]:!text-[10px]',
                index === benefits.length - 1 && 'max-[600px]:col-span-2',
              )}
            >
              <LandingIcon name={benefit.icon} className="size-4 max-[600px]:size-3.5" />
              {benefit.label}
            </Span>
          </Span>
        ))}
      </div>
    </div>
  );
};

export default HeroBenefits;
