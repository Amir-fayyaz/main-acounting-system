import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DataTable,
  DEFAULT_EMPTY_MESSAGE,
  DEFAULT_LOADING_MESSAGE,
  DEFAULT_SEARCH_EMPTY_MESSAGE,
  type DataTableColumn,
  type DataTableProps,
} from '@repo/web/ui/components/custom/ui/data-table/DataTable';

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

interface Row {
  id: number;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: 1, name: 'الف', amount: 1000 },
  { id: 2, name: 'ب', amount: 2500 },
];

const columns: DataTableColumn<Row>[] = [
  { key: 'id', header: 'شناسه' },
  { key: 'name', header: 'نام' },
  { key: 'amount', header: 'مبلغ', cell: (row) => `ریال ${row.amount}` },
];

function renderDataTable(query: string, props: Partial<DataTableProps<Row>> = {}) {
  state.query = query;
  state.replace.mockClear();
  return render(<DataTable columns={columns} rows={rows} {...props} />);
}

function previousLink() {
  return screen.getByRole('link', { name: 'Go to previous page' });
}

function nextLink() {
  return screen.getByRole('link', { name: 'Go to next page' });
}

function pageSizeSelect() {
  const select = screen.getByLabelText('در هر صفحه') as HTMLSelectElement;
  return { select, labels: Array.from(select.options).map((option) => option.text) };
}

describe('DataTable populated state', () => {
  it('renders one column header per column and one body row per item', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('columnheader')[1]).toHaveTextContent('نام');
    expect(screen.getAllByRole('row')).toHaveLength(1 + rows.length);
    expect(screen.getAllByRole('cell')).toHaveLength(columns.length * rows.length);
  });

  it('prints the row property when a column has no cell renderer', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByText('الف')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('uses the cell renderer when a column provides one', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.getByText('ریال 1000')).toBeInTheDocument();
    expect(screen.getByText('ریال 2500')).toBeInTheDocument();
  });

  it('supports a computed column that has no matching row property', () => {
    const computed: DataTableColumn<Row>[] = [
      { key: 'name', header: 'نام' },
      {
        key: 'actions',
        header: 'عملیات',
        cell: (row) => <button type="button">ویرایش {row.name}</button>,
      },
    ];
    render(<DataTable columns={computed} rows={[rows[0]]} />);
    expect(screen.getByRole('button', { name: 'ویرایش الف' })).toBeInTheDocument();
  });

  it('applies the table className and accessible name', () => {
    render(<DataTable columns={columns} rows={rows} className="border" aria-label="عضویت‌ها" />);
    expect(screen.getByRole('table', { name: 'عضویت‌ها' })).toHaveClass('border');
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
  });

  it('renders no state slot while rows are present', () => {
    render(<DataTable columns={columns} rows={rows} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_EMPTY_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_SEARCH_EMPTY_MESSAGE)).not.toBeInTheDocument();
  });
});

describe('DataTable loading state', () => {
  it('shows the loading slot instead of the rows and marks the table busy', () => {
    render(<DataTable columns={columns} rows={rows} loading />);
    expect(screen.getByRole('status')).toHaveTextContent(DEFAULT_LOADING_MESSAGE);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('الف')).not.toBeInTheDocument();
    expect(screen.getAllByRole('cell')).toHaveLength(1);
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
  });

  it('accepts a custom loading message', () => {
    render(<DataTable columns={columns} rows={rows} loading loadingMessage="صبر کنید" />);
    expect(screen.getByRole('status')).toHaveTextContent('صبر کنید');
  });
});

describe('DataTable error state', () => {
  it('shows the error slot instead of the rows', () => {
    render(<DataTable columns={columns} rows={rows} error="خطای شبکه" />);
    expect(screen.getByRole('alert')).toHaveTextContent('خطای شبکه');
    expect(screen.queryByText('الف')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('prefers the error slot over the loading slot', () => {
    render(<DataTable columns={columns} rows={rows} loading error="خطای شبکه" />);
    expect(screen.getByRole('alert')).toHaveTextContent('خطای شبکه');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-busy');
  });

  it('treats a missing error as the populated state', () => {
    render(<DataTable columns={columns} rows={rows} error={undefined} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByRole('cell')).toHaveLength(columns.length * rows.length);
  });
});

describe('DataTable empty states', () => {
  it('shows the general empty message when there is no search term', () => {
    render(<DataTable columns={columns} rows={[]} />);
    expect(screen.getByText(DEFAULT_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_SEARCH_EMPTY_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the search-specific empty message while a search term is active', () => {
    render(<DataTable columns={columns} rows={[]} searchTerm="ali" />);
    expect(screen.getByText(DEFAULT_SEARCH_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_EMPTY_MESSAGE)).not.toBeInTheDocument();
  });

  it('treats a blank search term as no search', () => {
    render(<DataTable columns={columns} rows={[]} searchTerm="   " />);
    expect(screen.getByText(DEFAULT_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_SEARCH_EMPTY_MESSAGE)).not.toBeInTheDocument();
  });

  it('lets callers override the empty messages', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        searchTerm="ali"
        emptyMessage="چیزی ثبت نشده"
        searchEmptyMessage="نتیجه‌ای پیدا نشد"
      />,
    );
    expect(screen.getByText('نتیجه‌ای پیدا نشد')).toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_SEARCH_EMPTY_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_EMPTY_MESSAGE)).not.toBeInTheDocument();
  });

  it('keeps the error slot ahead of the empty slots', () => {
    render(<DataTable columns={columns} rows={[]} searchTerm="ali" error="خطا" />);
    expect(screen.getByRole('alert')).toHaveTextContent('خطا');
    expect(screen.queryByText(DEFAULT_SEARCH_EMPTY_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_EMPTY_MESSAGE)).not.toBeInTheDocument();
  });
});

describe('DataTable pagination controls', () => {
  it('renders the server-provided summary next to the rows', () => {
    renderDataTable('page=2', { meta: { page: 2, limit: 20, total: 42, totalPages: 3 } });
    expect(screen.getByText('صفحه 2 از 3')).toBeInTheDocument();
    expect(screen.getByText('42 مورد')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(1 + rows.length);
    expect(screen.getAllByRole('columnheader')).toHaveLength(columns.length);
  });

  it('renders no pagination controls when meta is absent', () => {
    renderDataTable('page=2');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('در هر صفحه')).not.toBeInTheDocument();
    expect(screen.queryByText(/صفحه/)).not.toBeInTheDocument();
  });

  it('takes the totals from meta instead of counting the rendered rows', () => {
    renderDataTable('page=1', { meta: { page: 1, limit: 20, total: 1000, totalPages: 50 } });
    expect(screen.getByText('1000 مورد')).toBeInTheDocument();
    expect(screen.getByText('صفحه 1 از 50')).toBeInTheDocument();
    expect(screen.queryByText('2 مورد')).not.toBeInTheDocument();
    expect(screen.queryByText('صفحه 1 از 2')).not.toBeInTheDocument();
  });

  it('renders the controls safely for an empty result set', () => {
    renderDataTable('page=1', {
      rows: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });
    expect(screen.getByText(DEFAULT_EMPTY_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText('صفحه 1 از 1')).toBeInTheDocument();
    expect(screen.getByText('0 مورد')).toBeInTheDocument();
    expect(previousLink()).toHaveAttribute('aria-disabled', 'true');
    expect(nextLink()).toHaveAttribute('aria-disabled', 'true');
  });

  it('disables the previous control on the first page and ignores the click', () => {
    renderDataTable('page=1', { meta: { page: 1, limit: 20, total: 42, totalPages: 3 } });
    expect(previousLink()).toHaveAttribute('aria-disabled', 'true');
    expect(nextLink()).not.toHaveAttribute('aria-disabled');
    fireEvent.click(previousLink());
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('disables the next control on the last page and ignores the click', () => {
    renderDataTable('page=3', { meta: { page: 3, limit: 20, total: 42, totalPages: 3 } });
    expect(nextLink()).toHaveAttribute('aria-disabled', 'true');
    expect(previousLink()).not.toHaveAttribute('aria-disabled');
    fireEvent.click(nextLink());
    expect(state.replace).not.toHaveBeenCalled();
  });

  it('writes the next page to the URL while preserving unrelated parameters', () => {
    renderDataTable('search=ali&page=2', {
      meta: { page: 2, limit: 20, total: 42, totalPages: 3 },
    });
    fireEvent.click(nextLink());
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?search=ali&page=3');
  });

  it('writes the previous page to the URL', () => {
    renderDataTable('search=ali&page=3', {
      meta: { page: 3, limit: 20, total: 42, totalPages: 3 },
    });
    fireEvent.click(previousLink());
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?search=ali&page=2');
  });

  it('offers the default page sizes and selects the server-provided limit', () => {
    renderDataTable('search=ali&page=2', {
      meta: { page: 2, limit: 50, total: 42, totalPages: 3 },
    });
    const { select, labels } = pageSizeSelect();
    expect(labels).toEqual(['10', '20', '50', '100']);
    expect(select.value).toBe('50');
  });

  it('resets the page to 1 and writes the limit when the page size changes', () => {
    renderDataTable('search=ali&page=4', {
      meta: { page: 4, limit: 20, total: 42, totalPages: 5 },
    });
    fireEvent.change(pageSizeSelect().select, { target: { value: '50' } });
    expect(state.replace).toHaveBeenCalledWith('/panel/memberships?search=ali&page=1&limit=50');
  });

  it('accepts custom page sizes and drops invalid entries', () => {
    renderDataTable('page=2', {
      meta: { page: 2, limit: 30, total: 42, totalPages: 3 },
      pageSizes: [25, 50, 0, 1.5],
    });
    const { select, labels } = pageSizeSelect();
    expect(labels).toEqual(['25', '30', '50']);
    expect(select.value).toBe('30');
  });

  it('falls back to safe display values when meta is invalid', () => {
    renderDataTable('page=2', {
      meta: { page: Number.NaN, limit: -5, total: -1, totalPages: 0 },
    });
    expect(screen.getByText('صفحه 1 از 1')).toBeInTheDocument();
    expect(screen.getByText('0 مورد')).toBeInTheDocument();
    expect(previousLink()).toHaveAttribute('aria-disabled', 'true');
    expect(nextLink()).toHaveAttribute('aria-disabled', 'true');
    expect(pageSizeSelect().select.value).toBe('20');
  });
});
