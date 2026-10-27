import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  usePagination,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MIN_LIMIT,
  MAX_LIMIT,
} from '@repo/web/hooks/usePagination';

const state = vi.hoisted(() => ({
  pathname: '/panel/memberships',
  query: '',
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ replace: state.replace }),
  useSearchParams: () => new URLSearchParams(state.query),
}));

function renderPagination(query = '') {
  state.query = query;
  state.replace.mockClear();
  return renderHook(() => usePagination());
}

beforeEach(() => {
  renderPagination();
});

describe('usePagination URL parsing', () => {
  it('defaults to page 1 and limit 20 when the URL carries no pagination params', () => {
    const { result } = renderPagination('search=ali');
    expect(result.current.page).toBe(1);
    expect(result.current.limit).toBe(20);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('reads valid page and limit values from the URL', () => {
    const { result } = renderPagination('page=3&limit=50');
    expect(result.current.page).toBe(3);
    expect(result.current.limit).toBe(50);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('falls back to defaults for missing, non-numeric, or non-integer values', () => {
    for (const query of ['', 'page=&limit=', 'page=abc&limit=xyz', 'page=1.5&limit=2.7']) {
      const { result } = renderPagination(query);
      expect(result.current.page).toBe(DEFAULT_PAGE);
      expect(result.current.limit).toBe(DEFAULT_LIMIT);
    }
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('treats a non-positive page as the default page', () => {
    const { result } = renderPagination('page=0');
    expect(result.current.page).toBe(1);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('clamps numeric limits into the supported 1–100 range', () => {
    const low = renderPagination('limit=0');
    expect(low.result.current.limit).toBe(MIN_LIMIT);
    const high = renderPagination('limit=150');
    expect(high.result.current.limit).toBe(MAX_LIMIT);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('keeps a large page as-is because the backend tolerates out-of-range pages', () => {
    const { result } = renderPagination('page=999');
    expect(result.current.page).toBe(999);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('falls back to the default page for values beyond the safe-integer range', () => {
    const { result } = renderPagination('page=99999999999999999999');
    expect(result.current.page).toBe(DEFAULT_PAGE);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('treats negative page and limit values as defaults', () => {
    for (const query of ['page=-1', 'page=-999', 'limit=-5']) {
      const { result } = renderPagination(query);
      expect(result.current.page).toBe(DEFAULT_PAGE);
      expect(result.current.limit).toBe(DEFAULT_LIMIT);
    }
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('treats percent-encoded invalid values as defaults', () => {
    for (const query of ['page=%2D1', 'page=%31%2E%35', 'limit=%2D10', 'page=%E2%88%9E']) {
      const { result } = renderPagination(query);
      expect(result.current.page).toBe(DEFAULT_PAGE);
      expect(result.current.limit).toBe(DEFAULT_LIMIT);
    }
    expect(state.replace).not.toHaveBeenCalled();
  });
});

describe('usePagination navigation', () => {
  it('replaces the URL when the page changes and preserves unrelated parameters', () => {
    const { result } = renderPagination('search=ali&tab=users&page=1');
    act(() => result.current.setPage(2));
    expect(state.replace).toHaveBeenCalledWith(
      '/panel/memberships?search=ali&tab=users&page=2',
    );
  });

  it('does not navigate when the requested page is already current', () => {
    const { result } = renderPagination('page=2&limit=20');
    act(() => result.current.setPage(2));
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('resets the page to 1 when the page size changes', () => {
    const { result } = renderPagination('page=4&limit=20&search=ali');
    act(() => result.current.setLimit(50));
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?page=1&limit=50&search=ali');
    expect(state.replace).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when the requested page size is already current', () => {
    const { result } = renderPagination('page=2&limit=20');
    act(() => result.current.setLimit(20));
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('ignores invalid page and limit arguments instead of writing them to the URL', () => {
    const { result } = renderPagination('page=2&limit=20');
    act(() => result.current.setPage(0));
    act(() => result.current.setPage(-1));
    act(() => result.current.setPage(1.5));
    act(() => result.current.setPage(Number.NaN));
    act(() => result.current.setLimit(0));
    act(() => result.current.setLimit(101));
    act(() => result.current.setLimit(Number.NaN));
    expect(state.replace).not.toHaveBeenCalled();
    expect(result.current.page).toBe(2);
    expect(result.current.limit).toBe(20);
  });

  it('ignores page arguments beyond the safe-integer range', () => {
    const { result } = renderPagination('page=2&limit=20');
    act(() => result.current.setPage(Number.MAX_SAFE_INTEGER + 10));
    expect(state.replace).not.toHaveBeenCalled();
    expect(result.current.page).toBe(2);
  });

  it('re-renders with the updated URL after a page change', () => {
    const { result, rerender } = renderPagination('page=1&limit=20');
    act(() => result.current.setPage(3));
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?page=3&limit=20');
    state.query = 'limit=20&page=3';
    rerender();
    expect(result.current.page).toBe(3);
  });
});
