export type CurrencyCode = 'IRR';

export type MoneyAmount = string;
export type Money = MoneyAmount;

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  noPage?: boolean;
}

export interface CreateResult {
  id: string;
}
