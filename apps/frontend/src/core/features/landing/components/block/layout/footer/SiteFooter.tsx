import { PagesContainer } from '@repo/web/ui';
import Link from 'next/link';

import { Button, H2, P, Separator, Span } from '@repo/web/ui';

import { SiteBrand } from '@/core/components/custom/ui/brand/SiteBrand';
import {
  footerCaption,
  footerColumns,
  footerIdentity,
  footerMeta,
  footerSignature,
  footerTopline,
} from '@/core/features/landing/assets/mock/navigation';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';

const footerSeparatorClass = 'bg-[#57442c]';

export function SiteFooter() {
  return (
    <footer
      aria-label="پایان صفحه تراز"
      className="relative mt-16 overflow-hidden bg-[#21190f] text-[#fff6e5] max-md:mt-12"
    >
      <PagesContainer>
        <div>
          <div className="flex items-center justify-between gap-7 py-8 max-md:gap-5 max-md:py-7">
            <P className="text-2xl leading-loose font-semibold tracking-tight text-[#f9edda] max-md:max-w-60 max-md:text-xl max-md:leading-relaxed max-lg:text-xl">
              {footerTopline.title}
              <br />
              <Span className="text-[length:inherit] text-[#d7ae6d]">
                {footerTopline.titleAccent}
              </Span>
            </P>

            <Link
              href={footerTopline.href}
              className="flex items-center gap-2.5 text-xs text-[#f5d5a2] [&_svg]:size-5"
            >
              <Span className="text-[length:inherit]">{footerTopline.linkLabel}</Span>
              <LandingIcon name="arrow" />
            </Link>
          </div>

          <Separator className={footerSeparatorClass} />

          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-11 pt-10 pb-9 max-xl:grid-cols-[1.25fr_1fr_1fr_1fr] max-xl:gap-7 max-md:grid-cols-3 max-md:gap-y-7 max-md:gap-x-6 max-md:py-8 max-lg:grid-cols-[1.3fr_1fr_1fr] max-lg:gap-6">
            <div className="max-md:col-span-3 max-md:block max-lg:col-span-3 max-lg:grid max-lg:grid-cols-[1fr_1.2fr] max-lg:items-center max-lg:gap-y-1 max-lg:gap-x-11">
              <SiteBrand size="footer" />

              <P className="mt-5 max-w-60 text-xs leading-loose text-[#c4b397] max-md:mt-4 max-md:max-w-80 max-lg:col-start-2 max-lg:row-span-2 max-lg:m-0 max-lg:max-w-80">
                {footerIdentity.description}
              </P>

              <Span className="mt-5 flex items-center gap-1.5 text-xs text-[#dfc198] max-md:mt-3.5 max-lg:col-start-2 max-lg:mt-1.5">
                <span
                  aria-hidden="true"
                  className="block size-1 shrink-0 rounded-full bg-primary"
                />
                {footerIdentity.origin}
              </Span>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title}>
                <H2 className="mb-4 text-xs leading-loose font-semibold text-[#f7dfb8] max-md:mb-3.5">
                  {column.title}
                </H2>

                <nav aria-label={column.ariaLabel} className="flex flex-col gap-2.5 max-md:gap-3">
                  {column.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-xs text-[#c5b69e] transition-colors duration-200 hover:text-primary"
                    >
                      <Span className="text-[length:inherit]">{link.label}</Span>
                    </Link>
                  ))}
                </nav>
              </div>
            ))}
          </div>

          <Separator className={footerSeparatorClass} />

          <div className="flex items-center justify-between gap-9 py-6 text-[#bfae93] max-md:block max-md:py-5 max-lg:gap-7">
            <P className="max-w-144 text-xs leading-loose max-md:max-w-112 max-lg:max-w-112 [&_strong]:font-medium [&_strong]:text-[#ead5b4]">
              <strong>
                <Span className="text-[length:inherit]">{footerCaption.strong}</Span>
              </strong>{' '}
              {footerCaption.text}
            </P>

            <Link
              href={footerCaption.href}
              className="flex items-center gap-1.5 text-xs whitespace-nowrap text-[#f0d3a4] max-md:mt-4 [&_svg]:size-4"
            >
              <Span className="text-[length:inherit]">{footerCaption.linkLabel}</Span>
              <LandingIcon name="arrow" />
            </Link>
          </div>

          <Separator className={footerSeparatorClass} />

          <div className="flex items-center justify-between gap-7 pt-6 pb-8 max-md:py-5">
            <Span className="text-5xl leading-relaxed font-extrabold tracking-tighter text-[#857253] max-md:text-4xl">
              {footerSignature}
            </Span>

            <Button
              asChild
              variant="outline"
              aria-label="بازگشت به بالای صفحه"
              className="size-10 shrink-0 rounded-full border border-[#7e6442] bg-transparent p-0 text-[#ecd2a9] shadow-none hover:scale-100 hover:bg-[#352719] hover:text-[#ecd2a9] hover:shadow-none active:scale-100 max-md:size-9 [&_svg]:size-5 [&_svg]:rotate-90"
            >
              <Link href="#top">
                <LandingIcon name="arrow" />
              </Link>
            </Button>
          </div>

          <Separator className={footerSeparatorClass} />

          <div className="flex items-center justify-between gap-5 py-4 text-xs text-[#c3b095] max-md:items-start max-md:gap-3.5 max-md:leading-loose">
            {footerMeta.map((item, index) => (
              <Span
                key={item}
                className="text-[length:inherit] flex items-center gap-1.5 max-md:max-w-56 max-md:items-start [&_svg]:size-3 [&_svg]:text-[#e0b979] max-md:[&_svg]:mt-0.5"
              >
                {index === 0 ? <LandingIcon name="shield" /> : null}
                {item}
              </Span>
            ))}
          </div>
        </div>
      </PagesContainer>
    </footer>
  );
}
