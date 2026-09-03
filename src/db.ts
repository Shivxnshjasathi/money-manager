import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type { ITransaction, IAccount, ICategory, IBudget, IGoal, IRecurringTransaction } from './types';

// Re-export types for convenience
export type { ITransaction, IAccount, ICategory, IBudget, IGoal, IRecurringTransaction, TransactionType, AccountGroup } from './types';

// ── Database ──────────────────────────────────────
class MoneyDB extends Dexie {
  transactions!: Table<ITransaction, string>;
  accounts!: Table<IAccount, string>;
  categories!: Table<ICategory, string>;
  budgets!: Table<IBudget, string>;
  goals!: Table<IGoal, string>;
  recurring_transactions!: Table<IRecurringTransaction, string>;

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

    // Version 4: Add attachments, goals, and recurring transactions
    this.version(4).stores({
      transactions: 'id, type, date, category, accountId, toAccountId, recurringId',
      goals: 'id, name, deadline',
      recurring_transactions: 'id, type, categoryId, accountId, frequency, nextRunDate'
    }).upgrade(() => {
      // no data migration needed for added tables
    });

    // Version 5: Add updatedAt for cloud sync
    this.version(5).stores({
      transactions: 'id, type, date, category, accountId, toAccountId, recurringId, updatedAt',
      accounts: 'id, name, group, updatedAt',
      categories: 'id, name, type, updatedAt',
      budgets: 'id, categoryId, yearMonth, updatedAt',
      goals: 'id, name, deadline, updatedAt',
      recurring_transactions: 'id, type, categoryId, accountId, frequency, nextRunDate, updatedAt'
    }).upgrade(() => {
      // No data migration needed — updatedAt is optional
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
  { name: 'Groceries', icon: '🛒', type: 'expense' },
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
  const existingCats = await db.categories.toArray();
  const allDefaultCats = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
  
  const missingCats = allDefaultCats.filter(defaultCat => 
    !existingCats.some(c => c.name === defaultCat.name && c.type === defaultCat.type)
  ).map(c => ({ ...c, id: uuidv4() }));

  if (missingCats.length > 0) {
    await db.categories.bulkAdd(missingCats);
  }
}

// ── Process Recurring Transactions ──────────────────────
export async function processRecurringTransactions() {
  const recurring = await db.recurring_transactions.toArray();
  const now = new Date();
  
  for (const rt of recurring) {
    let nextRun = new Date(rt.nextRunDate);
    let updated = false;

    // While nextRun is in the past or present, generate transactions
    while (nextRun <= now) {
      await db.transactions.add({
        id: uuidv4(),
        type: rt.type,
        amount: rt.amount,
        date: nextRun.toISOString(),
        category: rt.categoryId,
        accountId: rt.accountId,
        toAccountId: rt.toAccountId,
        note: rt.note,
        description: rt.description,
        recurringId: rt.id,
        createdAt: Date.now(),
      });

      // Increment nextRun based on frequency
      if (rt.frequency === 'daily') {
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (rt.frequency === 'weekly') {
        nextRun.setDate(nextRun.getDate() + 7);
      } else if (rt.frequency === 'monthly') {
        nextRun.setMonth(nextRun.getMonth() + 1);
      } else if (rt.frequency === 'yearly') {
        nextRun.setFullYear(nextRun.getFullYear() + 1);
      }
      updated = true;
    }

    if (updated) {
      await db.recurring_transactions.update(rt.id, { nextRunDate: nextRun.toISOString() });
    }
  }
}

// ── Helper: delete a transaction by id ──
export async function deleteTransaction(id: string) {
  await db.transactions.delete(id);
  // Sync deletion to cloud
  import('./utils/syncService').then(({ deleteFromCloud }) => {
    deleteFromCloud('transactions', id);
  }).catch(() => {});
}

// ── Helper: clear ALL data and re-seed ──
export async function resetAllData() {
  await db.transactions.clear();
  await db.accounts.clear();
  await db.categories.clear();
  await db.budgets.clear();
  await db.goals.clear();
  await db.recurring_transactions.clear();
  await seedDatabase();
}

// ── Sync Hooks: Auto-push to cloud on local writes ──
function setupSyncHooks() {
  const tables = [
    { table: db.transactions, collection: 'transactions' },
    { table: db.accounts, collection: 'accounts' },
    { table: db.categories, collection: 'categories' },
    { table: db.budgets, collection: 'budgets' },
    { table: db.goals, collection: 'goals' },
    { table: db.recurring_transactions, collection: 'recurring' },
  ];

  for (const { table, collection } of tables) {
    // On create
    table.hook('creating', function (_primKey, obj) {
      obj.updatedAt = Date.now();
      // Fire-and-forget cloud push
      import('./utils/syncService').then(({ pushToCloud }) => {
        pushToCloud(collection, obj.id, obj);
      }).catch(() => {});
    });

    // On update
    table.hook('updating', function (modifications, _primKey, obj) {
      const updated = { ...obj, ...modifications, updatedAt: Date.now() };
      // Fire-and-forget cloud push
      import('./utils/syncService').then(({ pushToCloud }) => {
        pushToCloud(collection, updated.id, updated);
      }).catch(() => {});
      return { ...modifications, updatedAt: Date.now() };
    });
  }
}

setupSyncHooks();
