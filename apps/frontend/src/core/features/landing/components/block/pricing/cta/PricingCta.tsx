import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { pricingCta } from '@/core/features/landing/assets/mock/pricing';
import { Button, H2, P, Span } from '@repo/web/ui';

export function PricingCta() {
  return (
    <section className="py-8 sm:py-12">
      <div
        aria-labelledby="pricing-cta-title"
        className="flex items-center justify-between gap-9 rounded-xl border border-[#e1d7c3] bg-[#efe9d9] py-7 px-8 max-sm:block max-sm:rounded-lg max-sm:p-6 max-lg:p-6"
      >
        <div>
          <H2
            id="pricing-cta-title"
            className="mt-0 mr-0 mb-1 ml-0 text-2xl leading-relaxed font-bold tracking-tight max-sm:text-xl max-lg:text-xl"
          >
            {pricingCta.title}
          </H2>
          <P className="text-xs text-[#78674c]">{pricingCta.description}</P>
        </div>

        <Button
          asChild
          className="min-h-11 shrink-0 gap-2.5 rounded-lg border-0 bg-foreground px-6 py-2.5 text-xs leading-relaxed font-semibold text-white shadow-none hover:bg-[#3b2b1b] hover:text-white hover:scale-100 active:scale-100 max-sm:mt-5 max-sm:min-h-10 [&_svg]:size-5"
        >
          <Link href={pricingCta.href}>
            <Span className="text-[length:inherit]">{pricingCta.actionLabel}</Span>
            <ArrowLeft aria-hidden="true" strokeWidth={1.7} />
          </Link>
        </Button>
      </div>
    </section>
  );
}
