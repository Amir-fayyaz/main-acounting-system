import { H2, Muted } from '@/core/components/custom/ui/typography/Typography';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { companyBrands } from '@/core/features/landing/assets/mock/companies';
import { CompanyWordmark } from '@/core/features/landing/components/ui/company-wordmark/CompanyWordmark';

export function CompaniesSection() {
  return (
    <section
      id="companies"
      aria-labelledby="companies-title"
      className="relative mx-auto w-[min(1160px,calc(100%_-_80px))] border-b border-[#e7e1d4] pt-[53px] pb-[43px] max-[600px]:pt-[32px] max-[600px]:pb-[30px] max-[800px]:pt-[38px] max-[800px]:pb-[33px]"
    >
      <div className="flex flex-wrap items-center justify-center gap-3 max-[600px]:gap-x-2.5 max-[600px]:gap-y-[7px]">
        <H2
          id="companies-title"
          className="m-0 pb-0 text-[16px] leading-[1.9] font-semibold tracking-[-0.3px] max-[600px]:text-[13px] max-[600px]:leading-[2] max-[800px]:text-[14px]"
        >
          همراه تیم‌های مالی کسب‌وکارهای ایرانی
        </H2>

        <Badge
          variant="outline"
          className="inline-flex items-center gap-[5px] rounded-[5px] border-[#d8d0c0] bg-transparent px-2 py-[2px] text-[10px] leading-[1.8] font-medium whitespace-nowrap text-[#6e6251] max-[600px]:px-[6px] max-[600px]:text-[8px]"
        >
          چیدمان نمونه
        </Badge>
      </div>

      <div
        dir="rtl"
        aria-label="نام برندهای ایرانی؛ صرفاً نمونه برای نمایش طراحی"
        className="mt-8 mb-[21px] grid grid-cols-6 items-center gap-6 max-[1050px]:gap-[17px] max-[600px]:mt-[25px] max-[600px]:grid-cols-3 max-[600px]:gap-x-[15px] max-[600px]:gap-y-[26px] max-[600px]:mb-[21px] max-[800px]:mt-[27px] max-[800px]:mb-[18px]"
      >
        {companyBrands.map((brand) => (
          <CompanyWordmark key={brand.key} brand={brand} />
        ))}
      </div>

      <Muted className="mx-auto text-center text-[10px] leading-[1.9] text-[#746b60] max-[600px]:max-w-[300px] max-[600px]:leading-[2] max-[800px]:text-[9px]">
        نام برندها صرفاً برای نمایش این چیدمان است و به معنی مشتری بودن یا تأیید تراز نیست.
      </Muted>
    </section>
  );
}
