import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchInput } from '@repo/web';

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

/** Parses the most recent replace() target so assertions survive debounced commits. */
function lastUrl(): URL {
  const calls = nav.replace.mock.calls;
  return new URL(String(calls[calls.length - 1]?.[0]), 'http://test.local');
}

describe('SearchInput pagination reset', () => {
  it('resets the URL page to 1 when the search term changes on page 3', async () => {
    nav.search = 'page=3&status=active';
    const user = userEvent.setup();
    render(<SearchInput delay={0} />);

    await user.type(screen.getByRole('textbox'), 'خرید');

    await waitFor(() => {
      expect(nav.replace).toHaveBeenCalled();
      expect(lastUrl().searchParams.get('search')).toBe('خرید');
    });
    expect(lastUrl().searchParams.get('page')).toBe('1');
    expect(lastUrl().searchParams.get('status')).toBe('active');
    expect(
      nav.replace.mock.calls.every(
        (call) => new URL(String(call[0]), 'http://t').searchParams.get('page') !== '3',
      ),
    ).toBe(true);
  });

  it('does not add or rewrite the page parameter when the page is already 1', async () => {
    nav.search = 'page=1&foo=bar';
    const user = userEvent.setup();
    render(<SearchInput delay={0} />);

    await user.type(screen.getByRole('textbox'), 'x');

    await waitFor(() => expect(nav.replace).toHaveBeenCalledTimes(1));
    expect(lastUrl().searchParams.get('page')).toBe('1');
    expect(lastUrl().searchParams.get('search')).toBe('x');
    expect(lastUrl().searchParams.get('foo')).toBe('bar');
  });

  it('clearing the search preserves unrelated query parameters and restarts at page 1', async () => {
    nav.search = 'status=active&page=2&foo=bar&search=old';
    const user = userEvent.setup();
    render(<SearchInput delay={0} />);

    await user.clear(screen.getByRole('textbox'));

    await waitFor(() => {
      expect(nav.replace).toHaveBeenCalledTimes(1);
    });
    const url = lastUrl();
    expect(url.searchParams.get('search')).toBeNull();
    expect(url.searchParams.get('status')).toBe('active');
    expect(url.searchParams.get('foo')).toBe('bar');
    expect(url.searchParams.get('page')).toBe('1');
  });
});
