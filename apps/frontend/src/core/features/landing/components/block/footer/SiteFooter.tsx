import Link from 'next/link';

import { Button } from '@/core/components/shadcn/ui/button/button';
import { Separator } from '@/core/components/shadcn/ui/separator/separator';
import {
  footerCaption,
  footerColumns,
  footerIdentity,
  footerMeta,
  footerSignature,
  footerTopline,
} from '@/core/features/landing/assets/mock/navigation';
import { SiteBrand } from '@/core/features/landing/components/ui/brand/SiteBrand';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { H2, P, Span } from '@/core/components/custom/ui/typography/Typography';

const footerSeparatorClass = 'bg-[#57442c]';

export function SiteFooter() {
  return (
    <footer
      aria-label="پایان صفحه تراز"
      className="relative mt-[65px] overflow-hidden bg-[#21190f] text-[#fff6e5] max-[680px]:mt-[47px]"
    >
      <div className="landingContainerClass">
        <div className="flex items-center justify-between gap-[30px] py-[34px] max-[440px]:block max-[680px]:gap-5 max-[680px]:py-[27px]">
          <P className="text-[24px] leading-[1.9] font-[600] tracking-[-0.6px] text-[#f9edda] max-[440px]:max-w-none max-[440px]:text-[23px] max-[680px]:max-w-[240px] max-[680px]:text-[21px] max-[680px]:leading-[1.8] max-[850px]:text-[22px]">
            {footerTopline.title}
            <br />
            <Span className="text-[#d7ae6d]">{footerTopline.titleAccent}</Span>
          </P>

          <Link
            href={footerTopline.href}
            className="flex items-center gap-[10px] text-[12px] text-[#f5d5a2] max-[440px]:mt-[14px] max-[440px]:text-[11px] [&_svg]:size-5"
          >
            {footerTopline.linkLabel}
            <LandingIcon name="arrow" />
          </Link>
        </div>

        <Separator className={footerSeparatorClass} />

        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-[45px] pt-10 pb-[35px] max-[1050px]:grid-cols-[1.25fr_1fr_1fr_1fr] max-[1050px]:gap-7 max-[440px]:gap-x-[15px] max-[440px]:gap-y-[26px] max-[680px]:grid-cols-3 max-[680px]:gap-[28px_23px] max-[680px]:py-[31px] max-[850px]:grid-cols-[1.3fr_1fr_1fr] max-[850px]:gap-[25px]">
          <div className="max-[680px]:col-span-3 max-[680px]:block max-[850px]:col-span-3 max-[850px]:grid max-[850px]:grid-cols-[1fr_1.2fr] max-[850px]:items-center max-[850px]:gap-[5px_45px]">
            <SiteBrand size="footer" />

            <P className="mt-[19px] max-w-[240px] text-[12px] leading-[2.1] text-[#c4b397] max-[680px]:mt-4 max-[680px]:max-w-[340px] max-[850px]:col-start-2 max-[850px]:row-span-2 max-[850px]:m-0 max-[850px]:max-w-[330px]">
              {footerIdentity.description}
            </P>

            <Span className="mt-[21px] flex items-center gap-[7px] text-[10px] text-[#dfc198] max-[680px]:mt-[14px] max-[850px]:col-start-2 max-[850px]:mt-1.5">
              <span aria-hidden="true" className="block size-[5px] shrink-0 rounded-full bg-[#ffa00a]" />
              {footerIdentity.origin}
            </Span>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <H2 className="mb-4 text-[12px] leading-[1.9] font-[650] text-[#f7dfb8] max-[440px]:text-[11px] max-[680px]:mb-[15px]">
                {column.title}
              </H2>

              <nav
                aria-label={column.ariaLabel}
                className="flex flex-col gap-[11px] max-[440px]:gap-[13px] max-[680px]:gap-3"
              >
                {column.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-[11px] text-[#c5b69e] transition-colors duration-200 hover:text-[#ffa00a] max-[350px]:text-[9px] max-[440px]:text-[10px]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <Separator className={footerSeparatorClass} />

        <div className="flex items-center justify-between gap-[35px] py-6 text-[#bfae93] max-[680px]:block max-[680px]:py-[22px] max-[850px]:gap-[30px]">
          <P className="max-w-[590px] text-[11px] leading-[2] max-[680px]:max-w-[440px] max-[850px]:max-w-[450px] max-[850px]:text-[10px] [&_strong]:font-[500] [&_strong]:text-[#ead5b4]">
            <strong>{footerCaption.strong}</strong> {footerCaption.text}
          </P>

          <Link
            href={footerCaption.href}
            className="flex items-center gap-[7px] text-[11px] whitespace-nowrap text-[#f0d3a4] max-[680px]:mt-4 [&_svg]:size-4"
          >
            {footerCaption.linkLabel}
            <LandingIcon name="arrow" />
          </Link>
        </div>

        <Separator className={footerSeparatorClass} />

        <div className="flex items-center justify-between gap-[30px] pt-[26px] pb-[31px] max-[440px]:gap-[17px] max-[680px]:py-[22px]">
          <Span className="text-[clamp(33px,4.6vw,65px)] leading-[1.7] font-[800] tracking-[-2px] text-[#857253] max-[350px]:text-[27px] max-[440px]:text-[31px] max-[440px]:tracking-[-1.3px] max-[680px]:text-[38px] max-[680px]:tracking-[-1.5px]">
            {footerSignature}
          </Span>

          <Button
            asChild
            variant="outline"
            aria-label="بازگشت به بالای صفحه"
            className="size-[42px] shrink-0 rounded-full border border-[#7e6442] bg-transparent p-0 text-[#ecd2a9] shadow-none hover:scale-100 hover:bg-[#352719] hover:text-[#ecd2a9] hover:shadow-none active:scale-100 max-[680px]:size-[38px] [&_svg]:size-[19px] [&_svg]:rotate-90"
          >
            <Link href="#top">
              <LandingIcon name="arrow" />
            </Link>
          </Button>
        </div>

        <Separator className={footerSeparatorClass} />

        <div className="flex items-center justify-between gap-5 py-[17px] text-[9px] text-[#c3b095] max-[680px]:items-start max-[680px]:gap-[15px] max-[680px]:leading-[1.9] max-[440px]:text-[8px] max-[440px]:gap-3">
          {footerMeta.map((item, index) => (
            <Span
              key={item}
              className="flex items-center gap-[6px] max-[680px]:max-w-[230px] max-[680px]:items-start max-[440px]:max-w-[200px] [&_svg]:size-[13px] [&_svg]:text-[#e0b979] max-[680px]:[&_svg]:mt-0.5"
            >
              {index === 0 ? <LandingIcon name="shield" /> : null}
              {item}
            </Span>
          ))}
        </div>
      </div>
    </footer>
  );
}
