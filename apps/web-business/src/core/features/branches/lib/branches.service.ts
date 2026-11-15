import type { Branch, CreateBranchInput, ListBranchesParams } from '../assets/@types/branch';
import { getMockBranches, hasMockBranchCode, insertMockBranch } from '../assets/mock/branches.mock';

/** Page size used when the URL does not specify `limit` (shared contract). */
export const BRANCHES_DEFAULT_LIMIT = 20;

/** Upper bound accepted for `limit` (shared contract). */
export const BRANCHES_MAX_LIMIT = 100;

export interface BranchListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface BranchListResponse {
  data: Branch[];
  meta: BranchListMeta;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isSafeInteger(limit) || limit < 1) {
    return BRANCHES_DEFAULT_LIMIT;
  }
  return Math.min(limit, BRANCHES_MAX_LIMIT);
}

function searchHaystack(branch: Branch): string {
  return [branch.code, branch.name, branch.managerName, branch.status].join(' ').toLowerCase();
}

/**
 * Lists branches with search, status filtering and pagination.
 *
 * Mock implementation of the future `GET /branches` endpoint: it resolves the
 * same `{ data, meta }` envelope the UI consumes, so only this function has to
 * change when a real API is wired in.
 */
function filterBranches(params: ListBranchesParams = {}): Branch[] {
  const search = params.search?.trim().toLowerCase() ?? '';
  const status = params.status?.trim() ?? '';

  return getMockBranches().filter((branch) => {
    if (status && branch.status !== status) return false;
    if (!search) return true;

    return searchHaystack(branch).includes(search);
  });
}

/** Returns every branch matching the filters, without pagination. */
export async function listAllBranches(
  params: Pick<ListBranchesParams, 'search' | 'status'> = {},
): Promise<Branch[]> {
  return filterBranches(params);
}

export async function listBranches(params: ListBranchesParams = {}): Promise<BranchListResponse> {
  const limit = normalizeLimit(params.limit);

  const requestedPage =
    Number.isSafeInteger(params.page) && (params.page ?? 0) >= 1 ? (params.page as number) : 1;

  const filtered = filterBranches(params);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * limit;

  return {
    data: filtered.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
}

/**
 * Creates a branch. Rejects duplicate branch codes so the dialog can surface
 * the reason instead of silently accepting conflicting data.
 */
export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  if (hasMockBranchCode(input.code)) {
    throw new Error('شعبه‌ای با این کد قبلاً ثبت شده است.');
  }

  return insertMockBranch(input);
}
