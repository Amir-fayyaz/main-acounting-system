import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/core/components/shadcn/ui/button/button';
import { pricingCta } from '@/core/features/landing/assets/mock/pricing';
import { H2, P } from '@/core/components/custom/ui/typography/Typography';

export function PricingCta() {
  return (
    <section
      aria-labelledby="pricing-cta-title"
      className="mt-[35px] mb-[65px] flex items-center justify-between gap-[35px] rounded-[13px] border border-[#e1d7c3] bg-[#efe9d9] p-[29px_34px] max-[600px]:mt-[28px] max-[600px]:mb-[43px] max-[600px]:block max-[600px]:rounded-[10px] max-[600px]:p-6 max-[900px]:p-[26px]"
    >
      <div>
        <H2
          id="pricing-cta-title"
          className="mt-0 mr-0 mb-[5px] ml-0 text-[23px] leading-[1.8] font-bold tracking-[-0.5px] max-[600px]:text-[22px] max-[900px]:text-[21px]"
        >
          {pricingCta.title}
        </H2>
        <P className="text-xs text-[#78674c] max-[600px]:text-[11px]">
          {pricingCta.description}
        </P>
      </div>

      <Button
        asChild
        className="min-h-[44px] shrink-0 gap-[10px] rounded-[8px] border-0 bg-[#1a120a] px-6 py-2.5 text-xs leading-[1.6] font-[650] text-white shadow-none hover:bg-[#3b2b1b] hover:text-white hover:scale-100 active:scale-100 max-[600px]:mt-[19px] max-[600px]:min-h-[42px] max-[600px]:text-[11px] [&_svg]:size-[19px]"
      >
        <Link href={pricingCta.href}>
          {pricingCta.actionLabel}
          <ArrowLeft aria-hidden="true" strokeWidth={1.7} />
        </Link>
      </Button>
    </section>
  );
}
