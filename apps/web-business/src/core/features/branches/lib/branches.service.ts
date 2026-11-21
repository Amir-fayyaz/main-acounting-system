import type { Branch, CreateBranchInput, ListBranchesParams } from '../assets/@types/branch';
import { getMockBranches, hasMockBranchCode, insertMockBranch } from '../assets/mock/branches.mock';

export const BRANCHES_DEFAULT_LIMIT = 20;

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

function filterBranches(params: ListBranchesParams = {}): Branch[] {
  const search = params.search?.trim().toLowerCase() ?? '';
  const status = params.status?.trim() ?? '';

  return getMockBranches().filter((branch) => {
    if (status && branch.status !== status) return false;
    if (!search) return true;

    return searchHaystack(branch).includes(search);
  });
}

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


export async function createBranch(input: CreateBranchInput): Promise<Branch> {
  if (hasMockBranchCode(input.code)) {
    throw new Error('شعبه‌ای با این کد قبلاً ثبت شده است.');
  }

  return insertMockBranch(input);
}
