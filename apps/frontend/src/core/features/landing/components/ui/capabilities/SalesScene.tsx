import { Small, Span } from '@/core/components/custom/ui/typography/Typography';
import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { Card } from '@/core/components/shadcn/ui/card/card';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';

const invoiceItems = [
  { label: 'قطعه صنعتی A', quantity: '۱۲ واحد', value: '۲۴٬۰۰۰٬۰۰۰', icon: 'box' },
  { label: 'خدمات نصب', quantity: '۱ خدمت', value: '۸٬۰۰۰٬۰۰۰', icon: 'file' },
] as const;

export function SalesScene() {
  return (
    <div
      aria-label="نمونه ارتباط فاکتور فروش با انبار و پیش‌نویس سند"
      className="relative mx-7 mt-6 flex flex-1 flex-col items-start px-4 pb-5 before:absolute before:inset-x-1 before:top-5 before:bottom-3.5 before:bottom-16 before:rotate-[-3deg] before:rounded-lg before:border before:border-[#d9d1be] before:bg-[#f6f3e9] before:content-[''] max-xl:mx-3.5 max-xl:px-3 max-md:mx-6 max-md:mb-0 max-md:pb-9 max-md:px-2.5 max-lg:mx-3 max-lg:mt-5 max-lg:px-1"
    >
      <Card className="relative w-full rounded-lg border border-[#d8d0be] bg-[#fffefa] py-4 px-5 leading-relaxed shadow-[0_12px_24px_#4f3a1110] max-md:p-4 max-lg:py-3.5 max-lg:px-3">
        <div className="flex items-center justify-between gap-3 border-b border-[#e9e3d7] pb-2.5">
          <Span className="flex items-center gap-1.5 text-xs font-bold [&_svg]:size-4 [&_svg]:text-[#b16b00]">
            <LandingIcon name="receipt" />
            فاکتور فروش ۱۰۴۲
          </Span>

          <Badge className="px-1.5 py-0.5 text-xs bg-[#e7f4ed]">
            <Span className="text-[length:inherit]">فاکتور تأییدشده</Span>
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <Span className="block text-xs font-semibold">شرکت کاوش ایرانیان</Span>
            <Small className="block text-xs text-[#81715b]">طرف حساب · کد ۰۰۱۲۸</Small>
          </div>

          <Span className="text-xs text-[#81715b]">۱۴۰۵/۰۷/۲۵</Span>
        </div>

        <div className="rounded-sm bg-[#f6f5ee] py-1 px-2.5">
          {invoiceItems.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-2 text-xs max-md:gap-3.5 max-lg:gap-2.5 [&+&]:border-t [&+&]:border-[#e7e2d5] [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-1.5 [&_svg]:size-3 [&_svg]:text-[#9d7c41]"
            >
              <Span className="text-xs! font-medium!">
                <LandingIcon name={item.icon} />
                {item.label}
              </Span>

              <Small className="text-xs! font-normal! text-[#7a6e5c]">{item.quantity}</Small>

              <Span className="text-xs! font-medium!">{item.value}</Span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-[#776952]">
          <Span className="text-xs! font-medium! text-[#776952]">جمع اقلام</Span>

          <Span className="text-xl! font-semibold! tracking-tight text-[#1a120a] max-md:text-2xl! max-lg:text-lg! [&>small]:mr-1">
            ۳۲٬۰۰۰٬۰۰۰
            <Small className="text-xs! font-normal!">تومان</Small>
          </Span>
        </div>

        <div className="flex items-center justify-between gap-1.5 border-t border-[#ebe5d8] pt-2.5 text-xs text-[#786a56] max-lg:gap-0.5 [&>span]:flex [&>span]:items-center [&>span]:gap-1 [&>svg]:size-3 [&>svg]:text-[#b1966a]">
          <Span className="flex! items-center gap-1 text-xs! font-medium! text-[#786a56]">
            <i className="block size-1 shrink-0 rounded-full bg-[#367b5c]" />
            فاکتور فروش
          </Span>

          <LandingIcon name="arrow" />

          <Span className="flex! items-center gap-1 text-xs! font-medium! text-[#786a56]">
            <i className="block size-1 shrink-0 rounded-full bg-[#367b5c]" />
            حواله انبار
          </Span>

          <LandingIcon name="arrow" />

          <Span className="text-xs! font-medium! text-[#786a56]">پیش‌نویس سند</Span>
        </div>
      </Card>

      <div className="relative z-3 mt-3 flex items-center gap-2 self-end rounded-md bg-[#1a120a] py-2.5 px-3 text-xs text-[#fff7e5] shadow-[0_7px_15px_#2f20061a] max-lg:py-2 max-lg:px-2.5 [&>svg]:size-5 [&>svg]:text-[#ffa00a]">
        <LandingIcon name="book" />
        <div>
          <Span className="text-[length:inherit]">پیش‌نویس سند آماده است</Span>
          <Small className="mt-0.5 block text-xs text-[#cab697]">
            ثبت نهایی، پس از بررسی حسابدار
          </Small>
        </div>
      </div>
    </div>
  );
}
