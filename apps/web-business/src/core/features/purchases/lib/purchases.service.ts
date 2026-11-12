import type { CreatePurchaseInput, Purchase } from '../assets/@types/purchase';
import {
  getMockPurchases,
  insertMockPurchase,
} from '../assets/mock/purchases.mock';

export const PURCHASES_DEFAULT_LIMIT = 20;
export const PURCHASES_MAX_LIMIT = 100;

export interface PurchaseListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PurchaseListResponse {
  data: Purchase[];
  meta: PurchaseListMeta;
}

export interface ListPurchasesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  discountState?: string;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isSafeInteger(limit) || limit < 1) {
    return PURCHASES_DEFAULT_LIMIT;
  }
  return Math.min(limit, PURCHASES_MAX_LIMIT);
}

function searchHaystack(purchase: Purchase): string {
  return [
    purchase.no,
    purchase.supplier,
    purchase.description,
    purchase.status,
    purchase.discountState,
  ]
    .join(' ')
    .toLowerCase();
}

function filterPurchases(params: ListPurchasesParams): Purchase[] {
  const search = params.search?.trim().toLowerCase() ?? '';
  const status = params.status?.trim() ?? '';
  const discountState = params.discountState?.trim() ?? '';

  return getMockPurchases().filter((purchase) => {
    if (status && purchase.status !== status) return false;
    if (discountState && purchase.discountState !== discountState) return false;
    if (!search) return true;
    return searchHaystack(purchase).includes(search);
  });
}

/** Returns every purchase matching the filters, without pagination. */
export async function listAllPurchases(
  params: Pick<ListPurchasesParams, 'search' | 'status' | 'discountState'> = {},
): Promise<Purchase[]> {
  return filterPurchases(params);
}

export async function listPurchases(
  params: ListPurchasesParams = {},
): Promise<PurchaseListResponse> {
  const limit = normalizeLimit(params.limit);

  const requestedPage =
    Number.isSafeInteger(params.page) && (params.page ?? 0) >= 1
      ? (params.page as number)
      : 1;

  const filtered = filterPurchases(params);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * limit;

  return {
    data: filtered.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
}

export async function createPurchase(input: CreatePurchaseInput): Promise<Purchase> {
  return insertMockPurchase(input);
}
