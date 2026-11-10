import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseTableState, serializeTableState } from '../lib/url-state';
import {
  dateRangeFilter,
  multiSelectFilter,
  numberRangeFilter,
  textContainsFilter,
} from '../filters/filter-fns';
import { compareText, normalizeFa } from '../lib/text';
import { formatMoney, maskMoneyTyping, parseNumberInput } from '../lib/format';
import { toCsv } from '../lib/csv';

const row = (v: unknown) => ({ getValue: () => v });

test('url codec round-trips all filter types and keeps unrelated params', () => {
  const schema = {
    filters: { date: 'date', status: 'multiselect', amount: 'number', name: 'text' } as const,
    sortable: ['date', 'name', 'amount'],
  };
  const state = {
    page: 3,
    limit: 50,
    search: 'کریمی',
    sorting: [
      { id: 'date', desc: true },
      { id: 'name', desc: false },
    ],
    filters: {
      date: { from: '2026-10-17', to: '2026-10-23' },
      status: ['paid', 'a,b'],
      amount: { min: 100, max: 5000 },
      name: 'علی',
    },
  };
  const qs = serializeTableState(state, new URLSearchParams('tab=invoices&page=9'), schema);
  assert.equal(qs.get('tab'), 'invoices');
  assert.equal(qs.get('sort'), '-date,name');
  const back = parseTableState(new URLSearchParams(qs.toString()), schema);
  assert.deepEqual(back, state);
});

test('url codec: defaults omitted, junk ignored, sort allow-list enforced', () => {
  const schema = { filters: { date: 'date' } as const, sortable: ['date'] };
  const qs = serializeTableState(
    { page: 1, limit: 10, search: '  ', sorting: [], filters: {} },
    undefined,
    schema,
  );
  assert.equal(qs.toString(), '');
  const p = parseTableState(
    new URLSearchParams('page=-4&limit=99999&sort=-evil,date&f.date=2026-02-30..nope'),
    { ...schema, limits: { min: 1, max: 100, default: 10 } },
  );
  assert.equal(p.page, 1);
  assert.equal(p.limit, 100);
  assert.deepEqual(p.sorting, [{ id: 'date', desc: false }]);
  assert.deepEqual(p.filters, {});
});

test('single-day date filter (click on a date cell) is inclusive', () => {
  const f = { from: '2026-10-19', to: '2026-10-19' };
  assert.equal(dateRangeFilter(row('2026-10-19'), 'd', f), true);
  assert.equal(dateRangeFilter(row('2026-10-19T08:00:00Z'), 'd', f), true);
  assert.equal(dateRangeFilter(row('2026-10-20'), 'd', f), false);
  assert.equal(dateRangeFilter(row(null), 'd', f), false);
  assert.equal(dateRangeFilter(row('2026-10-01'), 'd', { from: '2026-10-02' }), false);
  assert.equal(dateRangeFilter(row('2026-10-01'), 'd', {}), true);
});

test('number / multiselect / text filters', () => {
  assert.equal(numberRangeFilter(row(500), 'a', { min: 100, max: 500 }), true);
  assert.equal(numberRangeFilter(row(501), 'a', { max: 500 }), false);
  assert.equal(numberRangeFilter(row(null), 'a', { min: 0 }), false);
  assert.equal(multiSelectFilter(row('paid'), 's', ['paid', 'open']), true);
  assert.equal(multiSelectFilter(row('void'), 's', ['paid']), false);
  assert.equal(textContainsFilter(row('علي كريمي'), 'n', 'علی کریمی'), true); // Arabic ي/ك vs Persian
  assert.equal(textContainsFilter(row('فاکتور ۱۲۳'), 'n', '123'), true); // digit systems
});

test('Persian-aware sorting: numeric aware + Arabic/Persian letters equal', () => {
  const list = ['فاکتور ۱۰', 'فاکتور ۲', 'علی', 'بهنام', 'کامران'];
  assert.deepEqual([...list].sort(compareText), [
    'بهنام',
    'علی',
    'فاکتور ۲',
    'فاکتور ۱۰',
    'کامران',
  ]);
  assert.equal(compareText('كريم', 'کریم'), 0);
  assert.equal(normalizeFa('  ۱۲۳  ي  '), '123 ی');
});

test('money format / parse', () => {
  assert.equal(formatMoney(1234567), '۱٬۲۳۴٬۵۶۷');
  assert.equal(formatMoney(-500), '(۵۰۰)');
  assert.equal(formatMoney(-500, { parentheses: false }), '-۵۰۰');
  assert.equal(formatMoney(null), '—');
  assert.equal(parseNumberInput('۱٬۲۳۴٬۵۶۷'), 1234567);
  assert.equal(parseNumberInput('(500)'), -500);
  assert.equal(parseNumberInput('-12.5'), -12.5);
  assert.equal(parseNumberInput('12٫5'), 12.5);
  assert.equal(parseNumberInput('abc'), null);
  assert.equal(parseNumberInput(''), null);
  assert.equal(maskMoneyTyping('1234567'), '۱٬۲۳۴٬۵۶۷');
});

test('csv: BOM, quoting and formula-injection guard', () => {
  const csv = toCsv(
    ['a', 'b'],
    [
      ['x,y', '=SUM(A1)'],
      [-5, 'say "hi"'],
    ],
  );
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"x,y"'));
  assert.ok(csv.includes("'=SUM(A1)"));
  assert.ok(csv.includes('-5,'));
  assert.ok(csv.includes('"say ""hi"""'));
});

import { buildTanstackColumns, resolveColumns } from '../columns/resolve-columns';
import { createSearchIndex } from '../columns/search';

interface Inv {
  id: string;
  customer: string;
  date: string;
  amount: number;
  status: string;
  memo?: string | null;
}
const status = {
  paid: { label: 'پرداخت‌شده', tone: 'success' as const },
  open: { label: 'باز', tone: 'warning' as const },
};
const cols = resolveColumns<Inv>([
  { key: 'id', header: 'شناسه' },
  { key: 'customer', header: 'مشتری', filter: true, editable: true },
  { key: 'date', header: 'تاریخ', type: 'date' },
  { key: 'amount', header: 'مبلغ', type: 'money' },
  { key: 'status', header: 'وضعیت', type: 'status', status },
  { id: 'actions', header: 'x', cell: () => null },
]);

test('column resolution defaults', () => {
  const by = Object.fromEntries(cols.map((c) => [c.id, c]));
  assert.equal(by.date.filter?.type, 'date');
  assert.equal(by.amount.filter?.type, 'number');
  assert.equal(by.amount.align, 'end');
  assert.equal(by.status.filter?.type, 'multiselect');
  assert.deepEqual(
    by.status.filter?.options?.map((o) => o.label),
    ['پرداخت‌شده', 'باز'],
  );
  assert.equal(by.id.filter, null); // plain text columns are not filterable unless asked
  assert.equal(by.customer.filter?.type, 'text');
  assert.equal(by.customer.editable?.type, 'text');
  assert.equal(by.date.clickToFilter, true);
  assert.equal(by.amount.clickToFilter, false);
  assert.equal(by.actions.sortable, false);
  assert.equal(buildTanstackColumns(cols).length, 6);
});

test('global search: Jalali date text, Persian digits, AND semantics, cache', () => {
  const data: Inv[] = [
    { id: 'INV-001', customer: 'علی كريمی', date: '2026-10-19', amount: 1234567, status: 'paid' },
    {
      id: 'INV-002',
      customer: 'سارا محمدی',
      date: '2026-09-23',
      amount: 500,
      status: 'open',
      memo: null,
    },
  ];
  const search = createSearchIndex<Inv>(cols);
  assert.deepEqual(
    search(data, 'کریمی').map((r) => r.id),
    ['INV-001'],
  ); // Arabic kaf/yeh in data
  assert.deepEqual(
    search(data, '۱۴۰۵/۰۷/۲۷').map((r) => r.id),
    ['INV-001'],
  ); // Jalali date, Persian digits
  assert.deepEqual(
    search(data, '1405/07/27').map((r) => r.id),
    ['INV-001'],
  );
  assert.deepEqual(
    search(data, '2026-09').map((r) => r.id),
    ['INV-002'],
  ); // Gregorian ISO
  assert.deepEqual(
    search(data, '1,234,567').map((r) => r.id),
    ['INV-001'],
  );
  assert.deepEqual(
    search(data, 'پرداخت‌شده').map((r) => r.id),
    ['INV-001'],
  );
  assert.deepEqual(
    search(data, 'سارا باز').map((r) => r.id),
    ['INV-002'],
  ); // AND of words
  assert.deepEqual(
    search(data, 'سارا پرداخت').map((r) => r.id),
    [],
  );
  assert.equal(search(data, '  ').length, 2);
});

import { reorderById } from '../lib/reorder';
test('reorderById moves inside the full list', () => {
  const l = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  assert.deepEqual(
    reorderById(l, 'a', 'c', (x) => x.id).map((x) => x.id),
    ['b', 'c', 'a', 'd'],
  );
  assert.deepEqual(
    reorderById(l, 'd', 'b', (x) => x.id).map((x) => x.id),
    ['a', 'd', 'b', 'c'],
  );
  assert.equal(
    reorderById(l, 'x', 'b', (x) => x.id),
    l,
  );
});

import { buildCsv } from '../lib/export';
import { resolvePaginationMeta } from '../lib/pagination';

test('csv export uses labels, raw Gregorian dates, numeric money and status labels', () => {
  const exportCols = resolveColumns<Inv>([
    { key: 'id', header: 'شناسه' },
    { key: 'date', header: 'تاریخ', type: 'date' },
    { key: 'amount', header: 'مبلغ', type: 'money' },
    { key: 'status', header: 'وضعیت', type: 'status', status },
  ]);
  const csv = buildCsv(exportCols, [
    {
      original: {
        id: 'INV-1',
        customer: 'علی',
        date: '2026-10-19',
        amount: 1234.5,
        status: 'paid',
      },
    },
  ]);
  assert.ok(csv.includes('INV-1'));
  assert.ok(csv.includes('2026-10-19'));
  assert.ok(csv.includes('1234.5'));
  assert.ok(csv.includes('پرداخت‌شده'));
});

test('pagination meta: client hides empty, server hides incomplete wiring', () => {
  const base = {
    isServer: false,
    paginate: true,
    total: 12,
    page: 2,
    limit: 10,
    totalPages: 2,
  };
  assert.deepEqual(resolvePaginationMeta(base), {
    page: 2,
    limit: 10,
    total: 12,
    totalPages: 2,
  });
  assert.equal(resolvePaginationMeta({ ...base, total: 0 }), null);
  assert.equal(resolvePaginationMeta({ ...base, paginate: false }), null);

  const meta = { page: 2, limit: 10, total: 12, totalPages: 2 };
  assert.equal(resolvePaginationMeta({ ...base, isServer: true, meta }), null);
  assert.deepEqual(
    resolvePaginationMeta({
      ...base,
      isServer: true,
      meta,
      serverPage: 2,
      serverLimit: 10,
      onServerPageChange: () => {},
      onServerLimitChange: () => {},
    }),
    meta,
  );
});
