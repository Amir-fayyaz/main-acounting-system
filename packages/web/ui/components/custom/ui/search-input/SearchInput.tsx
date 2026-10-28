'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '@repo/web/ui/components/shadcn/ui/input/input';
import { DEFAULT_PAGE } from '@repo/web/ui/utils/pagination';

const DEFAULT_PLACEHOLDER = 'جستجو…';
const DEFAULT_DEBOUNCE_MS = 300;

export interface SearchInputProps {
  /** Placeholder rendered inside the input. */
  title?: string;
  /** Debounce in milliseconds before the URL is updated. */
  delay?: number;
  /** @deprecated Misspelling of `delay`, kept so existing callers keep working. */
  dely?: number;
  /** URL query key for the search term. Defaults to `"search"`. */
  paramName?: string;
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
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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

  useEffect(() => cancel, [cancel]);

  return useMemo(
    () => Object.assign(debounced, { cancel }),
    [debounced, cancel],
  );
}

/**
 * Debounced search input synced to a URL query parameter.
 * When the term changes, `page` is reset to 1 so results start from the first page.
 * Unrelated query parameters are preserved.
 */
export function SearchInput({
  title = DEFAULT_PLACEHOLDER,
  delay,
  dely,
  paramName = 'search',
}: SearchInputProps = {}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const urlSearch = searchParams.get(paramName) ?? '';
  const [term, setTerm] = useState(urlSearch);
  const pushedTermRef = useRef<string | null>(null);

  const commitToUrl = useCallback(
    (nextTerm: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const currentTerm = params.get(paramName) ?? '';

      if (nextTerm) {
        params.set(paramName, nextTerm);
      } else {
        params.delete(paramName);
      }

      // Reset pagination when the search term actually changes.
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
    [paramName, pathname, replace, searchParams],
  );

  const scheduleCommit = useDebouncedCallback(
    commitToUrl,
    delay ?? dely ?? DEFAULT_DEBOUNCE_MS,
  );

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
