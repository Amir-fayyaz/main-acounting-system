/** Currency codes supported by branch money values. */
export type CurrencyCode = 'IRR';

/** Money is always a decimal string — never a JS `number`. */
export type Money = string;

/** Branch lifecycle state shown in the list and the status filter. */
export type BranchStatus = 'active' | 'inactive';

export interface Branch {
  id: string;
  code: string;
  name: string;
  managerName: string;
  /** Number of cash registers assigned to the branch. */
  cashRegisterCount: number;
  /** Number of users assigned to the branch. */
  userCount: number;
  /** Sales total for the current month, as a money string. */
  monthlySales: Money;
  currency: CurrencyCode;
  status: BranchStatus;
}

/** Fields the branch form collects; the service fills the remaining defaults. */
export type CreateBranchInput = Pick<Branch, 'code' | 'name' | 'managerName'>;

/** Filters accepted by the branch list endpoint. */
export interface ListBranchesParams {
  /** 1-based page number. */
  page?: number;
  /** Page size, `1–100`. */
  limit?: number;
  /** Free-text search over code, name, manager and status. */
  search?: string;
  /** Raw branch status, or an empty string for "all". */
  status?: string;
}
