'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/core/components/shadcn/ui/button/button';
import { navigationLinks, productMenuItems } from '@/core/features/landing/assets/mock/navigation';
import { SiteBrand } from '@/core/features/landing/components/ui/brand/SiteBrand';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { Small, Span } from '@repo/web/ui';
import { cn } from '@repo/web/ui/utils/cn';

const PRIMARY_NAV_ID = 'primary-navigation';
const PRODUCT_MENU_ID = 'product-menu';

const navLinkClass =
  'relative inline-flex min-h-[38px] items-center p-0 whitespace-nowrap max-[900px]:flex max-[900px]:min-h-[44px] max-[900px]:px-0 max-[900px]:py-[9px]';

const activeNavLinkClass =
  "font-bold text-[#925704] after:absolute after:right-1/2 after:bottom-[2px] after:h-[3px] after:w-[13px] after:translate-x-1/2 after:rounded-[3px] after:bg-[#ffa00a] after:content-[''] max-[900px]:after:hidden";

const inactiveNavLinkClass = 'transition-colors duration-200 hover:text-[#a45f00]';

const productTriggerClass =
  'min-h-[38px] gap-[5px] rounded-none bg-transparent px-0 py-0 text-[12px] font-[500] shadow-none hover:scale-100 hover:bg-transparent hover:shadow-none active:scale-100 max-[1100px]:text-[11px] max-[900px]:w-full max-[900px]:min-h-[44px] max-[900px]:justify-between max-[900px]:py-[9px] max-[900px]:text-[13px]';

const mobileTriggerClass =
  'hidden size-[37px] shrink-0 rounded-full border border-[#e2d9c8] bg-[#f8f5eb] p-0 text-[#1a120a] shadow-none hover:scale-100 hover:bg-[#f8f5eb] hover:shadow-none active:scale-100 max-[600px]:size-[34px] max-[900px]:flex';

function isActiveLink(pathname: string, href: string): boolean {
  const [path] = href.split('#');

  return path === '/' ? pathname === '/' : pathname === path;
}

export function SiteHeader() {
  const pathname = usePathname() ?? '/';
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const closeMenus = () => {
      setMobileOpen(false);
      setProductOpen(false);
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        closeMenus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenus();
      }
    };

    const desktopQuery = window.matchMedia('(min-width: 900px)');

    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        closeMenus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    desktopQuery.addEventListener('change', handleDesktopChange);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      desktopQuery.removeEventListener('change', handleDesktopChange);
    };
  }, []);

  const closeMenus = () => {
    setMobileOpen(false);
    setProductOpen(false);
  };

  const [homeLink, ...secondaryLinks] = navigationLinks;

  return (
    <header
      id="top"
      ref={headerRef}
      className="sticky top-[14px] z-40 mx-auto mt-[18px] w-[min(1280px,calc(100%_-_48px))] bg-transparent max-[600px]:top-[9px] max-[600px]:mt-[11px] max-[600px]:w-[calc(100%_-_24px)] max-[900px]:top-[11px] max-[900px]:mt-[13px] max-[900px]:w-[calc(100%_-_32px)]"
    >
      <nav
        aria-label="منوی اصلی"
        className="relative grid h-[72px] w-full grid-cols-[132px_1fr_auto] items-center gap-5 rounded-full border border-white bg-[#fffefaf5] px-[22px] shadow-[0_5px_22px_#4937130b] backdrop-blur-[16px] max-[1100px]:grid-cols-[110px_1fr_auto] max-[1100px]:gap-[15px] max-[1100px]:px-[19px] max-[600px]:h-[61px] max-[600px]:gap-2.5 max-[600px]:px-3 max-[900px]:h-16 max-[900px]:grid-cols-[1fr_auto] max-[900px]:gap-4 max-[900px]:px-[15px]"
      >
        <SiteBrand />

        <div
          id={PRIMARY_NAV_ID}
          className={cn(
            'items-center justify-center gap-[22px] p-0 text-[12px] font-[500] max-[1100px]:gap-[17px] max-[1100px]:text-[11px]',
            'max-[900px]:absolute max-[900px]:top-[calc(100%_+_11px)] max-[900px]:right-0 max-[900px]:left-0 max-[900px]:items-stretch max-[900px]:justify-start max-[900px]:gap-0 max-[900px]:rounded-[17px] max-[900px]:border max-[900px]:border-[#e2d6c0] max-[900px]:bg-[#fffefa] max-[900px]:px-5 max-[900px]:py-[13px] max-[900px]:text-[13px] max-[900px]:shadow-[0_12px_28px_#503a1312] max-[600px]:px-[18px]',
            mobileOpen
              ? 'flex max-[900px]:max-h-[calc(100svh_-_100px)] max-[900px]:flex-col max-[900px]:overflow-y-auto max-[900px]:overscroll-contain'
              : 'hidden min-[900px]:flex',
          )}
        >
          {homeLink ? (
            <Link
              href={homeLink.href}
              aria-current={isActiveLink(pathname, homeLink.href) ? 'page' : undefined}
              onClick={closeMenus}
              className={cn(
                navLinkClass,
                isActiveLink(pathname, homeLink.href) ? activeNavLinkClass : inactiveNavLinkClass,
              )}
            >
              {homeLink.label}
            </Link>
          ) : null}

          <div className="relative max-[900px]:w-full">
            <Button
              type="button"
              variant="ghost"
              aria-expanded={productOpen}
              aria-controls={PRODUCT_MENU_ID}
              onClick={() => setProductOpen((open) => !open)}
              className={productTriggerClass}
            >
              محصول
              <LandingIcon
                name="chevron"
                className={cn(
                  'h-[13px] w-[13px] transition-transform duration-[180ms]',
                  productOpen && 'rotate-180',
                )}
              />
            </Button>

            <div
              id={PRODUCT_MENU_ID}
              className={cn(
                'absolute top-[calc(100%_+_15px)] right-[-20px] z-[45] w-[250px] rounded-[13px] border border-[#e4dccd] bg-[#fffefa] p-[9px] shadow-[0_14px_30px_#49351515]',
                'max-[900px]:static max-[900px]:my-[3px] max-[900px]:mb-2 max-[900px]:w-full max-[900px]:rounded-none max-[900px]:border-0 max-[900px]:bg-[#f5f0e5] max-[900px]:p-[5px] max-[900px]:shadow-none',
                productOpen ? 'flex flex-col' : 'hidden',
              )}
            >
              {productMenuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenus}
                  className="flex min-h-12 items-center gap-[11px] rounded-[7px] p-[10px] text-[11px] hover:bg-[#f6f2e7]"
                >
                  <LandingIcon name={item.icon} className="size-5 text-[#a36b16]" />

                  <Span>
                    <strong className="block text-[11px] leading-[1.8] font-[600] max-[900px]:text-[12px]">
                      {item.label}
                    </strong>
                    <Small className="block text-[9px] leading-[1.8] font-normal text-[#746b60] max-[900px]:text-[10px]">
                      {item.description}
                    </Small>
                  </Span>
                </Link>
              ))}
            </div>
          </div>

          {secondaryLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              aria-current={isActiveLink(pathname, link.href) ? 'page' : undefined}
              onClick={closeMenus}
              className={cn(
                navLinkClass,
                isActiveLink(pathname, link.href) ? activeNavLinkClass : inactiveNavLinkClass,
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="m-0 flex items-center gap-[17px] max-[1100px]:gap-[13px] max-[600px]:gap-2 max-[900px]:gap-3">
          <Link
            href="/demo"
            className="text-[11px] whitespace-nowrap text-[#7a6341] max-[1100px]:text-[10px] max-[900px]:hidden"
          >
            مشاهده دمو
          </Link>

          <Button
            asChild
            className="min-h-[42px] gap-[7px] rounded-[30px] px-4 py-[9px] text-[11px] [&_svg]:size-[17px] max-[1100px]:px-[13px] max-[1100px]:text-[10px] max-[600px]:min-h-[37px] max-[600px]:gap-[5px] max-[600px]:px-3 max-[600px]:text-[10px] max-[600px]:[&_svg]:size-[15px] max-[900px]:min-h-[39px] max-[900px]:px-[14px] max-[900px]:py-2 max-[900px]:text-[11px]"
          >
            <Link href="/auth">
              ورود یا ثبت‌نام
              <LandingIcon name="users" />
            </Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            aria-label={mobileOpen ? 'بستن منو' : 'باز کردن منو'}
            aria-expanded={mobileOpen}
            aria-controls={PRIMARY_NAV_ID}
            onClick={() => setMobileOpen((open) => !open)}
            className={mobileTriggerClass}
          >
            <LandingIcon name="menu" className="h-[17px] w-[17px]" />
          </Button>
        </div>
      </nav>
    </header>
  );
}
