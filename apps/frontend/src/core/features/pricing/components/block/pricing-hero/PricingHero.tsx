import { H1, P, Span } from '@/core/components/custom/ui/typography/Typography';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import {
  pricingEyebrowClass,
  pricingMutedTextClass,
} from '@/core/features/pricing/lib/pricing-classes';
import { cn } from '@/core/utils/shadcn/utils';

export function PricingHero() {
  return (
    <section
      aria-labelledby="pricing-title"
      className="mx-auto max-w-[800px] pt-[66px] pb-[38px] text-center max-[600px]:pt-[43px] max-[600px]:pb-[30px] max-[900px]:pt-[53px]"
    >
      <Span className={pricingEyebrowClass}>تعرفه‌ها</Span>

      <H1
        id="pricing-title"
        className="mt-[17px] mb-[15px] text-[48px] leading-[1.65] font-extrabold tracking-[-1.8px] max-[600px]:mt-[13px] max-[600px]:mb-3 max-[600px]:text-[32px] max-[600px]:leading-[1.7] max-[600px]:tracking-[-1px] max-[900px]:text-[41px]"
      >
        به اندازه تیم‌تان،
        <br />
        <span className="text-[#a86400]">برای مسیر رشدتان.</span>
      </H1>

      <P
        className={cn(
          'mx-auto max-w-[570px] text-sm leading-[2.1] max-[600px]:max-w-[345px] max-[600px]:text-xs',
          pricingMutedTextClass,
        )}
      >
        همه پلن‌ها روی یک جریان مالی یکپارچه بنا شده‌اند. ظرفیت و همراهی مناسب تیم خودتان را
        انتخاب کنید.
      </P>

      <Badge
        variant="outline"
        className="mt-4 inline-flex min-h-0 items-center gap-[5px] rounded-[5px] border border-[#d8d0c0] bg-transparent px-2 py-[2px] text-[10px] leading-[1.8] font-medium whitespace-nowrap text-[#6e6251] max-[600px]:mt-[14px] max-[600px]:text-[9px]"
      >
        تمام قیمت‌ها، ظرفیت‌ها و پلن‌ها در این صفحه نمونه‌اند.
      </Badge>
    </section>
  );
}
