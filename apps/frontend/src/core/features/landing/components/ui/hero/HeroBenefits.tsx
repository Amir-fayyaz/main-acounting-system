import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@repo/web/ui/utils/cn';
import { Span } from '@repo/web/ui';

const benefits = [
  { label: 'طراحی‌شده برای حسابدار', icon: 'book' },
  { label: 'یک‌بار ورود، یک جریان داده', icon: 'link' },
  { label: 'هوش مصنوعی با تأیید شما', icon: 'shield' },
] as const;

const HeroBenefits = () => {
  return (
    <div>
      <div className="flex items-center justify-center gap-9 text-xs text-[#7b7061] max-sm:grid max-sm:grid-cols-2 max-sm:justify-items-center max-sm:gap-2.5 max-md:gap-5">
        {benefits.map((benefit, index) => (
          <Span key={benefit.label} className="contents! text-xs!">
            {index > 0 ? (
              <i aria-hidden="true" className="h-4 w-px bg-[#dcd5c7] max-sm:hidden" />
            ) : null}

            <Span
              className={cn(
                'flex! items-center gap-1.5 text-xs!',
                'max-md:text-xs! max-sm:text-xs!',
                index === benefits.length - 1 && 'max-sm:col-span-2',
              )}
            >
              <LandingIcon name={benefit.icon} className="size-4 max-sm:size-3.5" />
              {benefit.label}
            </Span>
          </Span>
        ))}
      </div>
    </div>
  );
};

export default HeroBenefits;
