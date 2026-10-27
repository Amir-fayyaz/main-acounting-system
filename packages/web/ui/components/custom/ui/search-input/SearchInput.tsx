'use client';

import { DEFAULT_PAGE } from '@repo/web/ui/utils/pagination';
import { Input } from '@repo/web/ui/components/shadcn/ui/input/input';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_PLACEHOLDER = 'جستجو بر اساس خدمت';
const DEFAULT_DEBOUNCE_MS = 300;

export interface SearchInputProps {
  /** Placeholder rendered inside the input. */
  title?: string;
  /** Debounce in milliseconds before the URL is updated. */
  delay?: number;
  /** @deprecated Misspelling of `delay`, kept so existing callers keep working. */
  dely?: number;
}

type DebouncedCallback<A extends unknown[]> = ((...args: A) => void) & {
  cancel: () => void;
};

function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
): DebouncedCallback<A> {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  });

  const cancel = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const debounced = useCallback(
    (...args: A) => {
      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        callbackRef.current(...args);
      }, delay);
    },
    [cancel, delay],
  );

  return useMemo(() => Object.assign(debounced, { cancel }), [debounced, cancel]);
}

export function SearchInput({ title = DEFAULT_PLACEHOLDER, delay, dely }: SearchInputProps = {}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const urlSearch = searchParams.get('search') ?? '';
  const [term, setTerm] = useState(urlSearch);
  const pushedTermRef = useRef<string | null>(null);

  const commitToUrl = useCallback(
    (nextTerm: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const currentTerm = params.get('search') ?? '';

      if (nextTerm) {
        params.set('search', nextTerm);
      } else {
        params.delete('search');
      }

      if (nextTerm !== currentTerm) {
        const currentPage = params.get('page');
        if (currentPage !== null && currentPage !== String(DEFAULT_PAGE)) {
          params.set('page', String(DEFAULT_PAGE));
        }
      }

      const nextQuery = params.toString();
      if (nextQuery === searchParams.toString()) return;

      pushedTermRef.current = nextTerm;
      replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
    },
    [pathname, replace, searchParams],
  );

  const scheduleCommit = useDebouncedCallback(commitToUrl, delay ?? dely ?? DEFAULT_DEBOUNCE_MS);

  // Adopt URL-driven changes (back/forward, another component) but ignore the
  // echo of our own navigation so in-flight typing is never clobbered.
  useEffect(() => {
    const pushedTerm = pushedTermRef.current;
    pushedTermRef.current = null;
    if (pushedTerm !== null && urlSearch === pushedTerm) return;
    setTerm(urlSearch);
    scheduleCommit.cancel();
  }, [scheduleCommit, urlSearch]);

  return (
    <Input
      placeholder={title}
      value={term}
      onChange={(event) => {
        setTerm(event.target.value);
        scheduleCommit(event.target.value);
      }}
    />
  );
}

export default SearchInput;
