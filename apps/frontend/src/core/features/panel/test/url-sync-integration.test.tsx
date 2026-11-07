import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchInput } from '@repo/web';

import { StatusFilter } from '../components/ui';
import { useListQuery } from '../hooks/useListQuery';

const OPTIONS = [
  { value: 'active', label: 'فعال' },
  { value: 'inactive', label: 'غیرفعال' },
];

const nav = vi.hoisted(() => ({
  pathname: '/panel/accounts',
  search: '',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({
    replace: (href: string) => {
      const url = new URL(href, 'http://test.local');
      nav.pathname = url.pathname;
      nav.search = url.search.startsWith('?') ? url.search.slice(1) : '';
    },
  }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));

beforeAll(() => {
  // jsdom does not implement the pointer/scroll APIs used by Radix Select.
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  nav.pathname = '/panel/accounts';
  nav.search = '';
});

/** Client list harness wiring the real hooks and controls to the mocked URL. */
function ListHarness() {
  const { page, search, status, setStatus, setPage } = useListQuery();
  return (
    <div>
      <SearchInput delay={0} />
      <StatusFilter value={status} options={OPTIONS} onChange={setStatus} />
      <output data-testid="search">{search}</output>
      <output data-testid="status">{status}</output>
      <output data-testid="page">{page}</output>
      <button type="button" onClick={() => setPage(page + 1)}>
        صفحه بعد
      </button>
    </div>
  );
}

describe('URL-synchronized list controls (integration)', () => {
  it('changing status updates the control and URL while preserving unrelated parameters', async () => {
    nav.search = 'foo=bar&page=3';
    const user = userEvent.setup();
    const { rerender } = render(<ListHarness />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'فعال' }));

    await waitFor(() => expect(nav.search).toContain('status=active'));
    rerender(<ListHarness />);

    expect(screen.getByRole('combobox')).toHaveTextContent('فعال');
    expect(screen.getByTestId('status')).toHaveTextContent('active');
    expect(screen.getByTestId('page')).toHaveTextContent('1');
    expect(nav.search).toContain('foo=bar');
    expect(nav.search).not.toContain('page=');
  });

  it('changing page updates the UI and preserves search, status and unrelated parameters', async () => {
    nav.search = 'search=x&status=active&page=1&foo=bar';
    const user = userEvent.setup();
    const { rerender } = render(<ListHarness />);

    await user.click(screen.getByRole('button', { name: 'صفحه بعد' }));

    await waitFor(() => expect(nav.search).toContain('page=2'));
    rerender(<ListHarness />);

    expect(screen.getByTestId('page')).toHaveTextContent('2');
    expect(screen.getByTestId('search')).toHaveTextContent('x');
    expect(screen.getByTestId('status')).toHaveTextContent('active');
    expect(screen.getByRole('combobox')).toHaveTextContent('فعال');
    expect(nav.search).toContain('foo=bar');
  });

  it('integrates SearchInput with useListQuery: search in URL, page reset, status and unrelated params preserved', async () => {
    nav.search = 'status=active&page=3&foo=bar';
    const user = userEvent.setup();
    const { rerender } = render(<ListHarness />);

    await user.type(screen.getByRole('textbox'), 'خرید');

    await waitFor(() => expect(nav.search).toContain('search='));
    rerender(<ListHarness />);

    expect(screen.getByTestId('search')).toHaveTextContent('خرید');
    expect(screen.getByRole('textbox')).toHaveValue('خرید');
    expect(screen.getByTestId('page')).toHaveTextContent('1');
    expect(screen.getByTestId('status')).toHaveTextContent('active');
    expect(screen.getByRole('combobox')).toHaveTextContent('فعال');
    expect(nav.search).toContain('status=active');
    expect(nav.search).toContain('foo=bar');
    expect(nav.search).not.toContain('page=3');
  });

  it('browser back restores the previous search, status and page values', async () => {
    nav.search = 'search=b&status=inactive&page=4&foo=bar';
    const { rerender } = render(<ListHarness />);

    expect(screen.getByTestId('search')).toHaveTextContent('b');
    expect(screen.getByRole('combobox')).toHaveTextContent('غیرفعال');
    expect(screen.getByTestId('page')).toHaveTextContent('4');

    // Simulate history back to the earlier list state.
    nav.search = 'search=a&status=active&page=2&foo=bar';
    rerender(<ListHarness />);

    expect(screen.getByTestId('search')).toHaveTextContent('a');
    expect(screen.getByRole('combobox')).toHaveTextContent('فعال');
    expect(screen.getByTestId('page')).toHaveTextContent('2');
    expect(nav.search).toContain('foo=bar');
  });

  it('browser forward restores the next search, status and page values', () => {
    nav.search = 'search=a&status=active&page=2&foo=bar';
    const { rerender } = render(<ListHarness />);

    expect(screen.getByTestId('search')).toHaveTextContent('a');
    expect(screen.getByRole('combobox')).toHaveTextContent('فعال');
    expect(screen.getByTestId('page')).toHaveTextContent('2');

    // Simulate history forward to the later list state.
    nav.search = 'search=b&status=inactive&page=4&foo=bar';
    rerender(<ListHarness />);

    expect(screen.getByTestId('search')).toHaveTextContent('b');
    expect(screen.getByRole('combobox')).toHaveTextContent('غیرفعال');
    expect(screen.getByTestId('page')).toHaveTextContent('4');
    expect(nav.search).toContain('foo=bar');
  });
});
