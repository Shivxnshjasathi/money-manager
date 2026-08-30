// ── Types (runtime-safe, re-exported as values via type aliases) ──

export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountGroup =
  | 'Cash'
  | 'Bank Accounts'
  | 'Card'
  | 'Debit Card'
  | 'Savings'
  | 'Top-Up/Prepaid'
  | 'Investments'
  | 'Overdrafts'
  | 'Loan'
  | 'Insurance'
  | 'Others';

export interface ITransaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  accountId: string;
  toAccountId?: string;
  note: string;
  description: string;
  isRecurring: boolean;
  fee: number;
}

export interface IBudget {
  id: string;
  categoryId: string; // 'overall' for total budget, or specific category ID
  amount: number;
  yearMonth: string; // e.g., '2026-08'
}

export interface IAccount {
  id: string;
  name: string;
  group: AccountGroup;
  balance: number;
  settlementDate: number;
  paymentDate: number;
}

export interface ICategory {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
}
