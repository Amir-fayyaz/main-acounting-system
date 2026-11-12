import type { CreateSaleInput, ListSalesParams, Sale } from '../assets/@types/sale';
import {
  BRANCHES,
  RATES,
  SELLERS,
  createSaleId,
  getMockSales,
  insertMockSale,
} from '../assets/mock/sales.mock';

export const SALES_DEFAULT_LIMIT = 20;
export const SALES_MAX_LIMIT = 100;

export interface SaleListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SaleListResponse {
  data: Sale[];
  meta: SaleListMeta;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isSafeInteger(limit) || limit < 1) {
    return SALES_DEFAULT_LIMIT;
  }
  return Math.min(limit, SALES_MAX_LIMIT);
}

function searchHaystack(sale: Sale): string {
  return [sale.no, sale.cust, sale.seller, sale.desc, sale.status].join(' ').toLowerCase();
}

function filterSales(params: ListSalesParams): Sale[] {
  const search = params.search?.trim().toLowerCase() ?? '';
  const status = params.status?.trim() ?? '';
  const seller = params.seller?.trim() ?? '';
  const discountState = params.discountState?.trim() ?? '';

  return getMockSales().filter((sale) => {
    if (status && sale.status !== status) return false;
    if (seller && sale.seller !== seller) return false;
    if (discountState && sale.discountState !== discountState) return false;
    if (!search) return true;
    return searchHaystack(sale).includes(search);
  });
}

export async function listAllSales(
  params: Pick<ListSalesParams, 'search' | 'status' | 'seller' | 'discountState'> = {},
): Promise<Sale[]> {
  return filterSales(params);
}

export async function listSales(params: ListSalesParams = {}): Promise<SaleListResponse> {
  const limit = normalizeLimit(params.limit);

  const requestedPage =
    Number.isSafeInteger(params.page) && (params.page ?? 0) >= 1
      ? (params.page as number)
      : 1;

  const filtered = filterSales(params);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * limit;

  return {
    data: filtered.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
}

export async function createSale(input: CreateSaleInput): Promise<Sale> {
  const gross = Number(input.gross);
  const discountPercent = Number(input.discountPercent || 0);
  const taxPercent = Number(input.taxPercent || 0);

  const discountAmount = Math.round((gross * discountPercent) / 100);
  const subtotal = gross - discountAmount;
  const taxAmount = Math.round((subtotal * taxPercent) / 100);
  const total = subtotal + taxAmount;

  const rate = RATES[input.seller] ?? 0;
  const comm = Math.round(((total - taxAmount) * rate) / 100);

  const sale: Sale = {
    id: createSaleId(),
    no: (2200 + getMockSales().length + 1).toLocaleString('fa-IR'),
    cust: input.cust,
    seller: input.seller,
    date: new Date().toLocaleDateString('fa-IR'),
    disc: discountAmount,
    pct: discountPercent,
    discountState: discountAmount > 0 ? 'با تخفیف' : 'بدون تخفیف',
    total: total.toFixed(2),
    paid: '0.00',
    comm: comm.toFixed(2),
    rate,
    desc: input.desc,
    status: 'تسویه‌نشده',
    currency: 'IRR',
  };

  return insertMockSale(sale);
}

export { SELLERS, BRANCHES };
