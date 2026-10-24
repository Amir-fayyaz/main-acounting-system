import { Badge } from '@/core/components/shadcn/ui/badge/badge';
import { Card } from '@/core/components/shadcn/ui/card/card';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { Small, Span } from '@repo/web/ui';

const invoiceItems = [
  { label: 'قطعه صنعتی A', quantity: '۱۲ واحد', value: '۲۴٬۰۰۰٬۰۰۰', icon: 'box' },
  { label: 'خدمات نصب', quantity: '۱ خدمت', value: '۸٬۰۰۰٬۰۰۰', icon: 'file' },
] as const;

export function SalesScene() {
  return (
    <div
      aria-label="نمونه ارتباط فاکتور فروش با انبار و پیش‌نویس سند"
      className="relative mx-7 mt-[25px] flex flex-1 flex-col items-start px-[18px] pb-[22px] before:absolute before:inset-[22px_4px_14px] before:bottom-[69px] before:rotate-[-3deg] before:rounded-[10px] before:border before:border-[#d9d1be] before:bg-[#f6f3e9] before:content-[''] max-[1050px]:mx-[15px] max-[1050px]:px-3 max-[350px]:mx-[11px] max-[440px]:mx-4 max-[440px]:px-[7px] max-[680px]:m-[24px_25px_0] max-[680px]:pb-9 max-[680px]:px-2.5 max-[850px]:mx-3 max-[850px]:mt-[21px] max-[850px]:px-[5px]"
    >
      <Card className="relative w-full rounded-[9px] border border-[#d8d0be] bg-[#fffefa] p-[18px_20px] leading-[1.8] shadow-[0_12px_24px_#4f3a1110] max-[350px]:px-[10px] max-[440px]:p-[14px_12px] max-[680px]:p-[18px] max-[850px]:p-[14px_12px]">
        <div className="flex items-center justify-between gap-3 border-b border-[#e9e3d7] pb-[11px]">
          <Span className="flex items-center gap-[7px] text-[11px] font-bold max-[350px]:text-[9px] max-[440px]:text-[10px] max-[680px]:text-[12px] max-[850px]:text-[10px] [&_svg]:size-4 [&_svg]:text-[#b16b00]">
            <LandingIcon name="receipt" />
            فاکتور فروش ۱۰۴۲
          </Span>

          <Badge className="px-1.5 py-0.5 text-[10px] bg-[#e7f4ed] max-[440px]:text-[9px] max-[680px]:text-[10px] max-[850px]:text-[9px]">
            فاکتور تأییدشده
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <Span className="block text-[11px] font-[600] max-[440px]:text-[10px]">
              شرکت کاوش ایرانیان
            </Span>
            <Small className="block text-[9px] text-[#81715b] max-[440px]:text-[8px]">
              طرف حساب · کد ۰۰۱۲۸
            </Small>
          </div>

          <Span className="text-[10px] text-[#81715b] max-[440px]:text-[9px]">۱۴۰۵/۰۷/۲۵</Span>
        </div>

        <div className="rounded-[5px] bg-[#f6f5ee] p-[4px_10px]">
          {invoiceItems.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-2 text-[10px] max-[350px]:gap-[6px] max-[350px]:text-[8px] max-[440px]:gap-[9px] max-[440px]:text-[9px] max-[680px]:gap-[14px] max-[680px]:text-[10px] max-[850px]:gap-[10px] max-[850px]:text-[9px] [&+&]:border-t [&+&]:border-[#e7e2d5] [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-[6px] [&_svg]:size-[13px] [&_svg]:text-[#9d7c41]"
            >
              <Span className="!text-[11px] !font-medium max-[350px]:!text-[9px] max-[440px]:!text-[10px]">
                <LandingIcon name={item.icon} />
                {item.label}
              </Span>

              <Small className="!text-[10px] !font-normal text-[#7a6e5c] max-[350px]:!text-[8px] max-[440px]:!text-[9px]">
                {item.quantity}
              </Small>

              <Span className="!text-[11px] !font-medium max-[350px]:!text-[9px] max-[440px]:!text-[10px]">
                {item.value}
              </Span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 text-[10px] text-[#776952]">
          <Span className="!text-[11px] !font-medium text-[#776952] max-[350px]:!text-[9px]">
            جمع اقلام
          </Span>

          <Span className="!text-[22px] !font-semibold tracking-[-0.5px] text-[#1a120a] max-[350px]:!text-[18px] max-[440px]:!text-[20px] max-[680px]:!text-[23px] max-[850px]:!text-[19px] [&>small]:mr-1">
            ۳۲٬۰۰۰٬۰۰۰
            <Small className="!text-[10px] !font-normal">تومان</Small>
          </Span>
        </div>

        <div className="flex items-center justify-between gap-[6px] border-t border-[#ebe5d8] pt-[11px] text-[9px] text-[#786a56] max-[350px]:text-[7px] max-[350px]:gap-[3px] max-[440px]:text-[8px] max-[440px]:gap-[3px] max-[680px]:text-[9px] max-[850px]:text-[8px] max-[850px]:gap-[3px] [&>span]:flex [&>span]:items-center [&>span]:gap-1 [&>svg]:size-3 [&>svg]:text-[#b1966a]">
          <Span className="!flex items-center gap-1 !text-[10px] !font-medium text-[#786a56] max-[350px]:!text-[8px] max-[440px]:!text-[9px]">
            <i className="block size-[5px] shrink-0 rounded-full bg-[#367b5c]" />
            فاکتور فروش
          </Span>

          <LandingIcon name="arrow" />

          <Span className="!flex items-center gap-1 !text-[10px] !font-medium text-[#786a56] max-[350px]:!text-[8px] max-[440px]:!text-[9px]">
            <i className="block size-[5px] shrink-0 rounded-full bg-[#367b5c]" />
            حواله انبار
          </Span>

          <LandingIcon name="arrow" />

          <Span className="!text-[10px] !font-medium text-[#786a56] max-[350px]:!text-[8px] max-[440px]:!text-[9px]">
            پیش‌نویس سند
          </Span>
        </div>
      </Card>

      <div className="relative z-[3] mt-3 flex items-center gap-[9px] self-end rounded-[7px] bg-[#1a120a] p-[10px_13px] text-[10px] text-[#fff7e5] shadow-[0_7px_15px_#2f20061a] max-[440px]:p-[9px_10px] max-[440px]:text-[9px] max-[440px]:[&>svg]:size-[19px] max-[680px]:p-[10px_12px] max-[680px]:text-[10px] max-[850px]:p-[9px_10px] max-[850px]:text-[9px] [&>svg]:size-[22px] [&>svg]:text-[#ffa00a]">
        <LandingIcon name="book" />
        <div>
          پیش‌نویس سند آماده است
          <Small className="mt-[2px] block text-[8px] text-[#cab697]">
            ثبت نهایی، پس از بررسی حسابدار
          </Small>
        </div>
      </div>
    </div>
  );
}
