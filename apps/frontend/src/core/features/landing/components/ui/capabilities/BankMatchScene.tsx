import { Card, CardContent, CardFooter, CardHeader, Small, Span } from '@repo/web/ui';

import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import Link from 'next/link';

export function BankMatchScene() {
  return (
    <>
      <div className="relative flex flex-1 flex-col justify-center px-7 pt-6 max-xl:px-5 max-md:mx-auto max-md:w-full max-md:max-w-112 max-md:pb-0 max-lg:px-4 max-lg:pb-0">
        <Card className="relative z-2 ml-8 gap-0 rounded-lg border border-[#dcd5c5] bg-[#fcfaf3] py-3 px-3.5 leading-relaxed shadow-none max-md:ml-10 max-md:py-3.5 max-md:px-4 max-lg:ml-4">
          <CardHeader className="grid grid-cols-[1fr_auto] grid-rows-1 items-center gap-3 p-0 text-xs text-[#786950] [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&_svg]:size-3.5 [&_svg]:text-[#9c6b24]">
            <Span className="text-xs">
              <LandingIcon name="bank" />
              واریز به حساب بانک
            </Span>

            <Small className="text-xs max-md:block max-lg:hidden">۲۵ مهر</Small>
          </CardHeader>

          <CardContent className="p-0">
            <strong className="mt-1 block text-xl leading-loose tracking-tight max-lg:text-base">
              <Span className="text-[length:inherit]">۳۲٬۰۰۰٬۰۰۰</Span>
              <Small className="text-xs font-normal tracking-normal text-[#796a54]">تومان</Small>
            </strong>
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-2.5 border-0 p-0 text-xs text-[#72644d] max-lg:gap-1">
            <Span className="text-xs">شناسه پرداخت</Span>
            <Span className="text-xs">۷۸۲۱۰۴۲</Span>
          </CardFooter>
        </Card>

        <div className="relative flex h-9 items-center justify-center before:absolute before:inset-y-0 before:w-px before:bg-[#947441] before:content-['']">
          <Span className="text-[length:inherit] relative z-1 grid size-9 place-items-center rounded-full border-4 border-[#231b12] bg-[#ffa00a] text-[#1a120a]">
            <LandingIcon name="spark" className="size-4" />
          </Span>
        </div>

        <Card className="relative z-2 mr-8 gap-0 rounded-lg border border-[#dcd5c5] bg-[#fcfaf3] py-3 px-3.5 leading-relaxed shadow-none max-md:mr-10 max-md:py-3.5 max-md:px-4 max-lg:mr-4">
          <CardHeader className="grid grid-cols-[1fr_auto] grid-rows-1 items-center gap-3 p-0 text-xs text-[#786950] [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&_svg]:size-3.5 [&_svg]:text-[#9c6b24]">
            <Span className="text-xs">
              <LandingIcon name="receipt" />
              فاکتور فروش ۱۰۴۲
            </Span>

            <Small className="text-xs max-md:block max-lg:hidden">کاوش ایرانیان</Small>
          </CardHeader>

          <CardContent className="p-0">
            <strong className="mt-1 block text-xl leading-loose tracking-tight max-lg:text-base">
              <Span className="text-[length:inherit]">۳۲٬۰۰۰٬۰۰۰</Span>
              <Small className="text-xs font-normal tracking-normal text-[#796a54]">تومان</Small>
            </strong>
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-2.5 border-0 p-0 text-xs text-[#72644d] max-lg:gap-1">
            <Span className="text-xs">شناسه فاکتور</Span>
            <Span className="text-xs">۷۸۲۱۰۴۲</Span>
          </CardFooter>
        </Card>
      </div>
      <Link
        href="#intelligence"
        className="mx-0 mt-5 mb-6 flex items-center justify-center gap-1.5 text-xs text-[#b8d5b6] max-md:mb-7 max-lg:my-4 max-lg:mb-5 [&_svg]:size-3.5"
      >
        <LandingIcon name="check" />
        <Span className="text-[length:inherit]">مبلغ و شناسه یکسان · آماده بررسی</Span>
        <LandingIcon name="arrow" />
      </Link>
      کامپوننت هاش + قسمتایی ک فونتش خوب نیست خوب کن
    </>
  );
}
