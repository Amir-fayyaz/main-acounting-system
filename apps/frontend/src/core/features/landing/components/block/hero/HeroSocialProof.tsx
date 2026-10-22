import { H2, Muted } from '@/core/components/custom/ui/typography/Typography';
import { BrandList } from './BrandList';
import HeroBenefits from './HeroBenefits';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';

export function HeroSocialProof() {
  return (
    <div className="mt-5 text-center border-b border-border pb-10 mb-15">
      <HeroBenefits />

      <div className="mt-5 flex flex-wrap items-baseline justify-center gap-3">
        <H2 className="text-sm font-medium sm:text-base">همراه تیم‌های مالی کسب‌وکارهای ایرانی</H2>

        <Badge
          className="rounded-[4px] px-2 py-0.5 text-[10px] text-muted-foreground"
          variant="outline"
        >
          چیدمان نمونه
        </Badge>
      </div>

      <BrandList />

      <Muted className="mt-5 text-[10px]">
        نام برندها صرفاً برای نمایش این چیدمان است و به معنی مشتری بودن یا تأیید تراز نیست.
      </Muted>
    </div>
  );
}
