import { cleanup, fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SearchInput, {
  type SearchInputProps,
} from '@repo/web/ui/components/custom/ui/search-input/SearchInput';

const DEBOUNCE_MS = 300;

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

function renderSearch(query = '', props: SearchInputProps = {}) {
  state.query = query;
  state.replace.mockClear();
  return render(<SearchInput {...props} />);
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

function type(term: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: term } });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SearchInput URL initialisation', () => {
  it('initialises the input from the URL search parameter', () => {
    renderSearch('search=ali&tab=users');
    expect(screen.getByRole('textbox')).toHaveValue('ali');
  });

  it('starts empty when the URL carries no search parameter', () => {
    renderSearch('tab=users');
    expect(screen.getByRole('textbox')).toHaveValue('');
  });
});

describe('SearchInput debounced navigation', () => {
  it('writes the URL only after the debounce delay has elapsed', () => {
    renderSearch('tab=users');
    type('ahmad');
    expect(state.replace).not.toHaveBeenCalled();
    advance(299);
    expect(state.replace).not.toHaveBeenCalled();
    advance(1);
    expect(state.replace).toHaveBeenCalledTimes(1);
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?tab=users&search=ahmad');
  });

  it('honours a custom delay', () => {
    renderSearch('tab=users', { delay: 50 });
    type('ahmad');
    advance(49);
    expect(state.replace).not.toHaveBeenCalled();
    advance(1);
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?tab=users&search=ahmad');
  });

  it('preserves unrelated query parameters', () => {
    renderSearch('search=ali&tab=users&sort=name');
    type('reza');
    advance(DEBOUNCE_MS);
    expect(state.replace).toHaveBeenCalledWith(
      '/panel/memberships?search=reza&tab=users&sort=name',
    );
  });

  it('resets page to 1 when the search term changes', () => {
    renderSearch('search=ali&page=4');
    type('reza');
    advance(DEBOUNCE_MS);
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?search=reza&page=1');
  });

  it('does not inject a page parameter when the URL already defaults to page 1', () => {
    renderSearch('search=ali');
    type('reza');
    advance(DEBOUNCE_MS);
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?search=reza');
  });

  it('clears the search parameter when the term is emptied', () => {
    renderSearch('search=ali&tab=users&page=4');
    type('');
    advance(DEBOUNCE_MS);
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?tab=users&page=1');
  });

  it('does not navigate when the typed value matches the URL', () => {
    renderSearch('search=ali&tab=users');
    type('ali');
    advance(DEBOUNCE_MS);
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('does not navigate when clearing an already-empty search', () => {
    renderSearch('tab=users');
    type('');
    advance(DEBOUNCE_MS);
    expect(state.replace).not.toHaveBeenCalled();
  });
});

describe('SearchInput URL synchronisation', () => {
  it('adopts external URL changes so the input never goes stale', () => {
    const { rerender } = renderSearch('search=ali');
    expect(screen.getByRole('textbox')).toHaveValue('ali');

    state.query = 'search=reza&tab=users';
    rerender(<SearchInput />);

    expect(screen.getByRole('textbox')).toHaveValue('reza');
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('keeps in-flight typing when the router echoes an earlier navigation', () => {
    const { rerender } = renderSearch('search=ali');
    const input = screen.getByRole('textbox');

    type('a');
    advance(DEBOUNCE_MS);
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?search=a');

    type('ab');
    state.query = 'search=a';
    rerender(<SearchInput />);
    expect(input).toHaveValue('ab');

    advance(DEBOUNCE_MS);
    expect(state.replace).toHaveBeenLastCalledWith('/panel/memberships?search=ab');
  });

  it('drops a pending write when the URL changes externally', () => {
    const { rerender } = renderSearch('search=ali');

    type('typing');
    state.query = 'search=external';
    rerender(<SearchInput />);
    expect(screen.getByRole('textbox')).toHaveValue('external');

    advance(1000);
    expect(state.replace).not.toHaveBeenCalled();
  });
});
