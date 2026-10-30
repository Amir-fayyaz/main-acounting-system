import { Badge, H2, Muted, Span } from '@repo/web/ui';

import { companyBrands } from '@/core/features/landing/assets/mock/companies';
import { CompanyWordmark } from '@/core/features/landing/components/ui/company-wordmark/CompanyWordmark';

export function CompaniesSection() {
  return (
    <section className="py-8 sm:py-12">
      <div
        id="companies"
        aria-labelledby="companies-title"
        className="relative mx-auto w-full border-b border-border"
      >
        <div className="flex flex-wrap items-center justify-center gap-3 max-sm:gap-x-2.5 max-sm:gap-y-1.5">
          <H2
            id="companies-title"
            className="m-0 pb-0 text-base leading-loose font-semibold tracking-tight max-sm:text-xs max-md:text-sm"
          >
            همراه تیم‌های مالی کسب‌وکارهای ایرانی
          </H2>

          <Badge
            variant="outline"
            className="inline-flex items-center gap-1 rounded-sm border-border bg-transparent px-2 py-0.5 text-xs leading-relaxed font-medium whitespace-nowrap text-muted-foreground max-sm:px-1.5"
          >
            <Span className="text-[length:inherit]">چیدمان نمونه</Span>
          </Badge>
        </div>

        <div
          dir="rtl"
          aria-label="نام برندهای ایرانی؛ صرفاً نمونه برای نمایش طراحی"
          className="mt-8 mb-5 grid grid-cols-6 items-center gap-6 max-xl:gap-4 max-sm:mt-6 max-sm:grid-cols-3 max-sm:gap-x-3.5 max-sm:gap-y-6 max-md:mt-7 max-md:mb-4"
        >
          {companyBrands.map((brand) => (
            <CompanyWordmark key={brand.key} brand={brand} />
          ))}
        </div>

        <Muted className="mx-auto text-center text-xs leading-loose text-muted-foreground max-sm:max-w-72">
          نام برندها صرفاً برای نمایش این چیدمان است و به معنی مشتری بودن یا تأیید تراز نیست.
        </Muted>
      </div>
    </section>
  );
}
