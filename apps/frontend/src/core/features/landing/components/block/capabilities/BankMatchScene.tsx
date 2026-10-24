import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { Card, CardContent, CardFooter, CardHeader, Small, Span } from '@repo/web/ui';
import Link from 'next/link';

export function BankMatchScene() {
  return (
    <>
      <div className="relative flex flex-1 flex-col justify-center px-[30px] pt-[26px] max-[1050px]:px-[22px] max-[440px]:px-[22px] max-[680px]:mx-auto max-[680px]:w-full max-[680px]:max-w-[470px] max-[680px]:p-[24px_27px_0] max-[850px]:p-[24px_17px_0]">
        <Card className="relative z-[2] ml-[34px] gap-0 rounded-[8px] border border-[#dcd5c5] bg-[#fcfaf3] p-[13px_15px] leading-[1.8] shadow-none max-[440px]:ml-[22px] max-[440px]:p-[13px_14px] max-[680px]:ml-[40px] max-[680px]:p-[14px_17px] max-[850px]:ml-4">
          <CardHeader className="grid grid-cols-[1fr_auto] grid-rows-1 items-center gap-3 p-0 text-[10px] text-[#786950] max-[440px]:text-[9px] max-[680px]:text-[10px] max-[850px]:text-[9px] [&>span]:flex [&>span]:items-center [&>span]:gap-[6px] [&_svg]:size-[14px] [&_svg]:text-[#9c6b24]">
            <Span className="text-[10px]">
              <LandingIcon name="bank" />
              واریز به حساب بانک
            </Span>

            <Small className="text-[9px] max-[680px]:block max-[680px]:text-[9px] max-[850px]:hidden">
              ۲۵ مهر
            </Small>
          </CardHeader>

          <CardContent className="p-0">
            <strong className="mt-1 block text-[20px] leading-[1.9] tracking-[-0.4px] max-[440px]:text-[21px] max-[680px]:text-[22px] max-[850px]:text-[17px]">
              ۳۲٬۰۰۰٬۰۰۰
              <Small className="text-[9px] font-normal tracking-normal text-[#796a54]">تومان</Small>
            </strong>
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-[10px] border-0 p-0 text-[9px] text-[#72644d] max-[440px]:text-[8px] max-[680px]:text-[9px] max-[850px]:gap-1 max-[850px]:text-[8px]">
            <Span className="text-[10px]">شناسه پرداخت</Span>
            <Span className="text-[10px]">۷۸۲۱۰۴۲</Span>
          </CardFooter>
        </Card>

        <div className="relative flex h-[37px] items-center justify-center before:absolute before:inset-y-0 before:w-px before:bg-[#947441] before:content-['']">
          <Span className="relative z-[1] grid size-[38px] place-items-center rounded-full border-4 border-[#231b12] bg-[#ffa00a] text-[#1a120a]">
            <LandingIcon name="spark" className="size-[17px]" />
          </Span>
        </div>

        <Card className="relative z-[2] mr-[34px] gap-0 rounded-[8px] border border-[#dcd5c5] bg-[#fcfaf3] p-[13px_15px] leading-[1.8] shadow-none max-[440px]:mr-[22px] max-[440px]:p-[13px_14px] max-[680px]:mr-[40px] max-[680px]:p-[14px_17px] max-[850px]:mr-4">
          <CardHeader className="grid grid-cols-[1fr_auto] grid-rows-1 items-center gap-3 p-0 text-[10px] text-[#786950] max-[440px]:text-[9px] max-[680px]:text-[10px] max-[850px]:text-[9px] [&>span]:flex [&>span]:items-center [&>span]:gap-[6px] [&_svg]:size-[14px] [&_svg]:text-[#9c6b24]">
            <Span className="text-[10px]">
              <LandingIcon name="receipt" />
              فاکتور فروش ۱۰۴۲
            </Span>

            <Small className="text-[9px] max-[680px]:block max-[680px]:text-[9px] max-[850px]:hidden">
              کاوش ایرانیان
            </Small>
          </CardHeader>

          <CardContent className="p-0">
            <strong className="mt-1 block text-[20px] leading-[1.9] tracking-[-0.4px] max-[440px]:text-[21px] max-[680px]:text-[22px] max-[850px]:text-[17px]">
              ۳۲٬۰۰۰٬۰۰۰
              <Small className="text-[9px] font-normal tracking-normal text-[#796a54]">تومان</Small>
            </strong>
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-[10px] border-0 p-0 text-[9px] text-[#72644d] max-[440px]:text-[8px] max-[680px]:text-[9px] max-[850px]:gap-1 max-[850px]:text-[8px]">
            <Span className="text-[10px]">شناسه فاکتور</Span>
            <Span className="text-[10px]">۷۸۲۱۰۴۲</Span>
          </CardFooter>
        </Card>
      </div>
      <Link
        href="#intelligence"
        className="mx-0 mt-5 mb-[23px] flex items-center justify-center gap-[7px] text-[10px] text-[#b8d5b6] max-[440px]:text-[10px] max-[680px]:m-[20px_0_27px] max-[680px]:text-[11px] max-[850px]:my-[17px_21px] max-[850px]:text-[9px] [&_svg]:size-[15px]"
      >
        <LandingIcon name="check" />
        مبلغ و شناسه یکسان · آماده بررسی
        <LandingIcon name="arrow" />
      </Link>
      کامپوننت هاش + قسمتایی ک فونتش خوب نیست خوب کن
    </>
  );
}
