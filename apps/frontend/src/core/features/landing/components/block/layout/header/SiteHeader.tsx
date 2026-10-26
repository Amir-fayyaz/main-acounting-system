'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Button, Small, Span } from '@repo/web/ui';
import { navigationLinks, productMenuItems } from '@/core/features/landing/assets/mock/navigation';
import { SiteBrand } from '@/core/features/landing/components/ui/brand/SiteBrand';
import { LandingIcon } from '@/core/features/landing/components/ui/icon/LandingIcon';
import { cn } from '@repo/web/ui/utils/cn';

const PRIMARY_NAV_ID = 'primary-navigation';
const PRODUCT_MENU_ID = 'product-menu';

const navLinkClass =
  'relative inline-flex min-h-9 items-center p-0 whitespace-nowrap max-lg:flex max-lg:min-h-11 max-lg:px-0 max-lg:py-2';

const activeNavLinkClass =
  "font-bold text-[#925704] after:absolute after:right-1/2 after:bottom-0.5 after:h-0.5 after:w-3 after:translate-x-1/2 after:rounded-sm after:bg-[#ffa00a] after:content-[''] max-lg:after:hidden";

const inactiveNavLinkClass = 'transition-colors duration-200 hover:text-[#a45f00]';

const productTriggerClass =
  'min-h-9 gap-1 rounded-none bg-transparent px-0 py-0 text-xs font-medium shadow-none hover:scale-100 hover:bg-transparent hover:shadow-none active:scale-100 max-lg:w-full max-lg:min-h-11 max-lg:justify-between max-lg:py-2';

const mobileTriggerClass =
  'hidden size-9 shrink-0 rounded-full border border-[#e2d9c8] bg-[#f8f5eb] p-0 text-[#1a120a] shadow-none hover:scale-100 hover:bg-[#f8f5eb] hover:shadow-none active:scale-100 max-sm:size-8 max-lg:flex';

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

    const desktopQuery = window.matchMedia('(min-width: 1024px)');

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
      className="sticky top-3 z-40 mx-5 mt-4 max-w-7xl bg-transparent sm:mx-8 xl:mx-auto"
    >
      <nav
        aria-label="منوی اصلی"
        className="relative grid h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 rounded-full border border-white bg-[#fffefaf5] px-5 shadow-[0_5px_22px_#4937130b] backdrop-blur-lg max-xl:gap-3.5 max-sm:gap-2.5 max-sm:px-3 max-lg:grid-cols-[1fr_auto] max-lg:gap-4 max-lg:px-3.5"
      >
        <SiteBrand />

        <div
          id={PRIMARY_NAV_ID}
          className={cn(
            'items-center justify-center gap-5 p-0 text-xs font-medium max-xl:gap-4',
            'max-lg:absolute max-lg:top-full max-lg:mt-3 max-lg:right-0 max-lg:left-0 max-lg:items-stretch max-lg:justify-start max-lg:gap-0 max-lg:rounded-2xl max-lg:border max-lg:border-[#e2d6c0] max-lg:bg-[#fffefa] max-lg:px-5 max-lg:py-3 max-lg:text-xs max-lg:shadow-[0_12px_28px_#503a1312] max-sm:px-4',
            mobileOpen
              ? 'flex max-lg:max-h-[calc(100svh-6rem)] max-lg:flex-col max-lg:overflow-y-auto max-lg:overscroll-contain'
              : 'hidden lg:flex',
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
              <Span className="text-[length:inherit]">{homeLink.label}</Span>
            </Link>
          ) : null}

          <div className="relative max-lg:w-full">
            <Button
              type="button"
              variant="ghost"
              aria-expanded={productOpen}
              aria-controls={PRODUCT_MENU_ID}
              onClick={() => setProductOpen((open) => !open)}
              className={productTriggerClass}
            >
              <Span className="text-[length:inherit]">محصول</Span>
              <LandingIcon
                name="chevron"
                className={cn(
                  'h-3 w-3 transition-transform duration-200',
                  productOpen && 'rotate-180',
                )}
              />
            </Button>

            <div
              id={PRODUCT_MENU_ID}
              className={cn(
                'absolute top-full mt-4 -right-5 z-45 w-64 rounded-xl border border-[#e4dccd] bg-[#fffefa] p-2 shadow-[0_14px_30px_#49351515]',
                'max-lg:static max-lg:my-0.5 max-lg:mb-2 max-lg:w-full max-lg:rounded-none max-lg:border-0 max-lg:bg-[#f5f0e5] max-lg:p-1 max-lg:shadow-none',
                productOpen ? 'flex flex-col' : 'hidden',
              )}
            >
              {productMenuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenus}
                  className="flex min-h-12 items-center gap-2.5 rounded-md p-2.5 text-xs hover:bg-[#f6f2e7]"
                >
                  <LandingIcon name={item.icon} className="size-5 text-[#a36b16]" />

                  <Span className="text-[length:inherit]">
                    <strong className="block text-xs leading-relaxed font-semibold">
                      <Span className="text-[length:inherit]">{item.label}</Span>
                    </strong>
                    <Small className="block text-xs leading-relaxed font-normal text-[#746b60]">
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
              <Span className="text-[length:inherit]">{link.label}</Span>
            </Link>
          ))}
        </div>

        <div className="m-0 flex items-center gap-4 max-xl:gap-3 max-sm:gap-2 max-lg:gap-3">
          <Link href="/demo" className="text-xs whitespace-nowrap text-[#7a6341] max-lg:hidden">
            <Span className="text-[length:inherit]">مشاهده دمو</Span>
          </Link>

          <Button
            asChild
            className="min-h-10 gap-1.5 rounded-full px-4 py-2 text-xs [&_svg]:size-4 max-xl:px-3 max-sm:min-h-9 max-sm:gap-1 max-sm:px-3 max-sm:[&_svg]:size-3.5 max-lg:px-3.5"
          >
            <Link href="/auth">
              <Span className="text-[length:inherit]">ورود یا ثبت‌نام</Span>
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
            <LandingIcon name="menu" className="h-4 w-4" />
          </Button>
        </div>
      </nav>
    </header>
  );
}
