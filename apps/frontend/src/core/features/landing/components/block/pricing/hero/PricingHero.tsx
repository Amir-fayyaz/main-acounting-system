import { H1, P, Span } from '@/core/components/custom/ui/typography/Typography';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { cn } from '@/core/utils/shadcn/utils';

export function PricingHero() {
  return (
    <section className="py-8 sm:py-12">
      <div aria-labelledby="pricing-title" className="mx-auto max-w-200 text-center">
        <Span className="pricing-eyebrow">تعرفه‌ها</Span>

        <H1
          id="pricing-title"
          className="mt-4 mb-3.5 leading-relaxed font-extrabold tracking-tighter max-sm:mt-3 max-sm:mb-3 text-3xl sm:text-5xl"
        >
          به اندازه تیم‌تان،
          <br />
          <Span className="text-[length:inherit] text-[#a86400]">برای مسیر رشدتان.</Span>
        </H1>

        <P
          className={cn(
            'text-[#746b60] mx-auto max-w-144 text-sm leading-loose max-sm:max-w-80 max-sm:text-xs',
          )}
        >
          همه پلن‌ها روی یک جریان مالی یکپارچه بنا شده‌اند. ظرفیت و همراهی مناسب تیم خودتان را
          انتخاب کنید.
        </P>

        <Badge
          variant="outline"
          className="mt-4 inline-flex min-h-0 items-center gap-1 rounded-sm border border-[#d8d0c0] bg-transparent px-2 py-0.5 text-xs leading-relaxed font-medium whitespace-nowrap text-[#6e6251] max-sm:mt-3.5"
        >
          <Span className="text-[length:inherit]">
            تمام قیمت‌ها، ظرفیت‌ها و پلن‌ها در این صفحه نمونه‌اند.
          </Span>
        </Badge>
      </div>
    </section>
  );
}
