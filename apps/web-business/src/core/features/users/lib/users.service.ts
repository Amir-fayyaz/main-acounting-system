import type { CreateUserInput, ListUsersParams, User } from '../assets/@types/user';
import { getMockUsers, hasMockUserEmail, insertMockUser } from '../assets/mock/users.mock';

/** Page size used when the URL does not specify `limit`. */
export const USERS_DEFAULT_LIMIT = 20;

/** Upper bound accepted for `limit`. */
export const USERS_MAX_LIMIT = 100;

export interface UserListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UserListResponse {
  data: User[];
  meta: UserListMeta;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isSafeInteger(limit) || limit < 1) {
    return USERS_DEFAULT_LIMIT;
  }
  return Math.min(limit, USERS_MAX_LIMIT);
}

function searchHaystack(user: User): string {
  return [user.name, user.email, user.role, user.branch, user.status].join(' ').toLowerCase();
}

function filterUsers(params: ListUsersParams = {}): User[] {
  const search = params.search?.trim().toLowerCase() ?? '';
  const role = params.role?.trim() ?? '';

  return getMockUsers().filter((user) => {
    if (role && user.role !== role) return false;
    if (!search) return true;
    return searchHaystack(user).includes(search);
  });
}

/** Returns every user matching the filters, without pagination. */
export async function listAllUsers(
  params: Pick<ListUsersParams, 'search' | 'role'> = {},
): Promise<User[]> {
  return filterUsers(params);
}

/**
 * Lists users with search, role filtering and pagination.
 * Mock implementation of a future paginated endpoint; resolves `{ data, meta }`.
 */
export async function listUsers(params: ListUsersParams = {}): Promise<UserListResponse> {
  const limit = normalizeLimit(params.limit);
  const requestedPage =
    Number.isSafeInteger(params.page) && (params.page ?? 0) >= 1 ? (params.page as number) : 1;

  const filtered = filterUsers(params);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const start = (page - 1) * limit;

  return {
    data: filtered.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
}

/** Creates a user. Rejects duplicate email addresses. */
export async function createUser(input: CreateUserInput): Promise<User> {
  if (hasMockUserEmail(input.email)) {
    throw new Error('کاربری با این ایمیل قبلاً ثبت شده است.');
  }
  return insertMockUser(input);
}
