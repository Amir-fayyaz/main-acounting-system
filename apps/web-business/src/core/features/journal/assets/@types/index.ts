export type JournalStatus = 'balanced' | 'draft';

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string;
  amount: string;
  currency: 'IRR';
  status: JournalStatus;
}

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
}

export interface JournalFormData {
  date: string;
  number: string;
  description: string;
  lines: JournalLine[];
}

export interface JournalStats {
  count: number;
  totalAmount: string;
  draftCount: number;
}

export interface ChartAccount {
  code: string;
  name: string;
  label: string;
}

export interface ListJournalParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}
