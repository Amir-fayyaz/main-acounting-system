import type { CurrencyCode, Money } from './common';

export type RecordStatus = 'active' | 'inactive';
export type PaymentStatus = 'settled' | 'partially-settled' | 'unsettled';
export type ChequeStatus =
  'pending' | 'collected' | 'near-due' | 'returned' | 'overdue' | 'endorsed';

export interface BankAccount {
  id: string;
  title: string;
  type: 'bank' | 'cash' | 'petty-cash';
  bankName: string | null;
  accountNumber: string | null;
  branchName: string;
  balance: Money;
  currency: CurrencyCode;
  status: RecordStatus;
}

export interface JournalEntry {
  id: string;
  number: string;
  date: string;
  description: string;
  amount: Money;
  currency: CurrencyCode;
  status: 'balanced' | 'draft';
}

export interface Cheque {
  id: string;
  direction: 'received' | 'issued';
  sayadId: string;
  counterparty: string;
  bankName: string;
  amount: Money;
  currency: CurrencyCode;
  dueDate: string;
  status: ChequeStatus;
}

export interface Invoice {
  id: string;
  number: string;
  customerName: string;
  issueDate: string;
  total: Money;
  paid: Money;
  remaining: Money;
  currency: CurrencyCode;
  status: PaymentStatus;
}

export interface Purchase {
  id: string;
  number: string;
  supplierName: string;
  issueDate: string;
  total: Money;
  currency: CurrencyCode;
  dueDate: string;
  status: PaymentStatus;
}

export interface PosTerminal {
  id: string;
  title: string;
  terminalNumber: string;
  merchantNumber: string;
  bankName: string;
  feePercentage: string;
  settlementAccount: string;
  activatedAt: string;
  status: RecordStatus;
}

export interface TrialBalanceRow {
  id: string;
  code: string;
  name: string;
  debit: Money;
  credit: Money;
  currency: CurrencyCode;
}
