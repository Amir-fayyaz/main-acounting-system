/** Currency/amounts not used for users; kept minimal for future API parity. */

/** User account status shown in the list and filters (mapped to Persian labels in UI). */
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  /** Display name. */
  name: string;
  /** Login/contact email. */
  email: string;
  /** Role label. */
  role: string;
  /** Branch name. */
  branch: string;
  status: UserStatus;
}

/** Fields collected by the add-user form. */
export interface CreateUserInput {
  name: string;
  email: string;
  role: string;
  branch?: string;
}

/** Filters accepted by the user list endpoint. */
export interface ListUsersParams {
  /** 1-based page number. */
  page?: number;
  /** Page size, `1–100`. */
  limit?: number;
  /** Free-text search over name, email, role and branch. */
  search?: string;
  /** Raw role, or an empty string for "all". */
  role?: string;
}
