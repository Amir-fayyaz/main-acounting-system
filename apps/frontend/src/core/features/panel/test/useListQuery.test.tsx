import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PANEL_DEFAULT_LIMIT, PANEL_PAGE_SIZES, useListQuery } from '../hooks/useListQuery';
import { useStatusFilter } from '../hooks/useStatusFilter';

const nav = vi.hoisted(() => ({
  pathname: '/panel/accounts',
  search: '',
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeEach(() => {
  nav.pathname = '/panel/accounts';
  nav.search = '';
  nav.replace.mockReset();
});

describe('panel list query constants', () => {
  it('defaults panel lists to 10 rows with 10/20/50 page sizes', () => {
    expect(PANEL_DEFAULT_LIMIT).toBe(10);
    expect(PANEL_PAGE_SIZES).toEqual([10, 20, 50]);
  });
});

describe('useListQuery', () => {
  it('defaults to page 1, limit 10 and empty search/status when the URL has no list params', () => {
    const { result } = renderHook(() => useListQuery());

    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(10);
    expect(result.current.search).toBe('');
    expect(result.current.status).toBe('');
    expect(result.current.queryParams).toEqual({ page: 1, limit: 10 });
  });

  it('reads explicit page, limit, search and status from the URL', () => {
    const search = `page=3&limit=50&search=${encodeURIComponent('خرید')}&status=active`;
    nav.search = search;

    const { result } = renderHook(() => useListQuery());

    expect(result.current.page).toBe(3);
    expect(result.current.limit).toBe(50);
    expect(result.current.search).toBe('خرید');
    expect(result.current.status).toBe('active');
  });

  it('clamps an out-of-range URL limit to the supported maximum', () => {
    nav.search = 'limit=999';

    const { result } = renderHook(() => useListQuery());

    expect(result.current.limit).toBe(100);
  });

  it('writes a status change, resets the page and preserves unrelated params', () => {
    nav.search = 'foo=bar&page=4&status=old';

    const { result } = renderHook(() => useListQuery());
    act(() => result.current.setStatus('active'));

    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith('/panel/accounts?foo=bar&status=active');
  });

  it('removes the status parameter when the filter is cleared', () => {
    nav.search = 'search=x&status=active';

    const { result } = renderHook(() => useListQuery());
    act(() => result.current.setStatus(''));

    expect(nav.replace).toHaveBeenCalledWith('/panel/accounts?search=x');
  });

  it('trims the status value before writing it', () => {
    const { result } = renderHook(() => useListQuery());
    act(() => result.current.setStatus('  active  '));

    expect(nav.replace).toHaveBeenCalledWith('/panel/accounts?status=active');
  });

  it('skips redundant status updates', () => {
    nav.search = 'status=active&page=2';

    const { result } = renderHook(() => useListQuery());
    act(() => result.current.setStatus('active'));

    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('skips clearing when no status filter is active', () => {
    const { result } = renderHook(() => useListQuery());
    act(() => result.current.setStatus(''));

    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('changes the limit and resets the page to 1', () => {
    nav.search = 'page=3';

    const { result } = renderHook(() => useListQuery());
    act(() => result.current.setLimit(20));

    expect(nav.replace).toHaveBeenCalledWith('/panel/accounts?page=1&limit=20');
  });

  it('moves to another page without touching the other parameters', () => {
    nav.search = 'status=active';

    const { result } = renderHook(() => useListQuery());
    act(() => result.current.setPage(2));

    expect(nav.replace).toHaveBeenCalledWith('/panel/accounts?status=active&page=2');
  });
});

describe('useStatusFilter', () => {
  it('supports a custom query parameter name', () => {
    nav.search = 'result=failure';

    const { result } = renderHook(() => useStatusFilter('result'));
    expect(result.current.status).toBe('failure');

    act(() => result.current.setStatus('success'));
    expect(nav.replace).toHaveBeenCalledWith('/panel/accounts?result=success');
  });

  it('drops the page parameter when switching filters on a later page', () => {
    nav.search = 'page=2&status=draft';

    const { result } = renderHook(() => useStatusFilter());
    act(() => result.current.setStatus('balanced'));

    expect(nav.replace).toHaveBeenCalledWith('/panel/accounts?status=balanced');
  });
});
