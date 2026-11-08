'use client';

import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '../../../../../shadcn/ui/input/input';
import { P, Span } from '../../../../ui/typography/Typography';
import { CiSearch } from 'react-icons/ci';
import type { SidebarNavigationGroup } from '../../../../ui/sidebar/assets/@types/sidebar';
import { SidebarIcon } from '../../../../ui/sidebar/SidebarIcon';
import { getSidebarLinks } from '../../../../ui/sidebar/utils/navigation';
import { normalizePanelSearch } from '../../../utils/navigation';

export function PanelSearch({ navigation }: { navigation: readonly SidebarNavigationGroup[] }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const resultsId = useId();
  const search = normalizePanelSearch(query);
  const results = getSidebarLinks(navigation).filter((item) =>
    normalizePanelSearch(item.label).includes(search),
  );
  const showResults = focused && search.length > 0;

  return (
    <form
      role="search"
      ref={formRef}
      className="relative min-w-0 flex-1 sm:max-w-sm"
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        if (search && results[0]) {
          router.push(results[0].href);
          setQuery('');
          setFocused(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          formRef.current?.querySelector('input')?.focus();
          setQuery('');
          setFocused(false);
        }
        if (event.key === 'ArrowDown' && showResults && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          formRef.current?.querySelector('a')?.focus();
        }
      }}
    >
      <label className="sr-only" htmlFor={`${resultsId}-input`}>
        <Span>جستجو در پنل</Span>
      </label>
      <CiSearch
        className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={`${resultsId}-input`}
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setFocused(true);
        }}
        placeholder="جستجو در پنل…"
        autoComplete="off"
        aria-controls={showResults ? resultsId : undefined}
        className="h-11 rounded-lg border-border bg-card ps-10 pe-3 text-sm shadow-none"
      />
      {showResults && (
        <div
          id={resultsId}
          aria-label="نتایج جستجو"
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-auto rounded-lg border bg-popover p-2 shadow-md"
        >
          {results.length ? (
            <ul>
              {results.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      setQuery('');
                      setFocused(false);
                    }}
                    className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <SidebarIcon name={item.icon} className="size-5 shrink-0" />
                    <Span className="text-sm">{item.label}</Span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <P role="status" className="p-3 text-sm text-muted-foreground">
              بخشی با این نام پیدا نشد.
            </P>
          )}
        </div>
      )}
    </form>
  );
}
