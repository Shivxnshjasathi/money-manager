import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { ITransaction, IAccount, ICategory, IBudget } from './types';

// Re-export types for convenience
export type { ITransaction, IAccount, ICategory, IBudget, TransactionType, AccountGroup } from './types';

// ── Database ──────────────────────────────────────
class MoneyDB extends Dexie {
  transactions!: Table<ITransaction, string>;
  accounts!: Table<IAccount, string>;
  categories!: Table<ICategory, string>;
  budgets!: Table<IBudget, string>;

  constructor() {
    super('MoneyManagerDB');
    this.version(1).stores({
      transactions: 'id, type, date, category, accountId, toAccountId',
      accounts: 'id, name, group',
      categories: 'id, name, type',
    });

    // Version 2: Force clear old dummy accounts & transactions to give a completely clean slate
    this.version(2).stores({}).upgrade(async tx => {
      await tx.table('transactions').clear();
      await tx.table('accounts').clear();
    });

    // Version 3: Add budgets
    this.version(3).stores({
      budgets: 'id, categoryId, yearMonth'
    });
  }
}

export const db = new MoneyDB();

// ── Seed Data (categories & accounts only, no dummy transactions) ──
const DEFAULT_EXPENSE_CATEGORIES: Omit<ICategory, 'id'>[] = [
  { name: 'Food', icon: '🍜', type: 'expense' },
  { name: 'Social Life', icon: '🧑‍🤝‍🧑', type: 'expense' },
  { name: 'Pets', icon: '🐶', type: 'expense' },
  { name: 'Transport', icon: '🚕', type: 'expense' },
  { name: 'Culture', icon: '🖼️', type: 'expense' },
  { name: 'Household', icon: '🪑', type: 'expense' },
  { name: 'Apparel', icon: '👘', type: 'expense' },
  { name: 'Beauty', icon: '💄', type: 'expense' },
  { name: 'Health', icon: '🧘', type: 'expense' },
  { name: 'Education', icon: '📙', type: 'expense' },
  { name: 'Gift', icon: '🎁', type: 'expense' },
  { name: 'Other', icon: '📝', type: 'expense' },
];

const DEFAULT_INCOME_CATEGORIES: Omit<ICategory, 'id'>[] = [
  { name: 'Salary', icon: '💰', type: 'income' },
  { name: 'Allowance', icon: '💵', type: 'income' },
  { name: 'Bonus', icon: '🎉', type: 'income' },
  { name: 'Petty Cash', icon: '🪙', type: 'income' },
  { name: 'Other', icon: '📝', type: 'income' },
];

export async function seedDatabase() {
  const catCount = await db.categories.count();
  if (catCount === 0) {
    const allCats = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]
      .map(c => ({ ...c, id: uuidv4() }));
    await db.categories.bulkAdd(allCats);
  }
}

// ── Helper: delete a transaction by id ──
export async function deleteTransaction(id: string) {
  await db.transactions.delete(id);
}

// ── Helper: clear ALL data and re-seed ──
export async function resetAllData() {
  await db.transactions.clear();
  await db.accounts.clear();
  await db.categories.clear();
  await seedDatabase();
}
