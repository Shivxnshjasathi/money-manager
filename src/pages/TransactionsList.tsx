import { useState, useMemo, useRef } from 'react';
import { format, addMonths, subMonths, isSameDay } from 'date-fns';
import { Search, X } from 'lucide-react';
import TopBar from '../components/TopBar';
import Tabs from '../components/Tabs';
import TransactionItem from '../components/TransactionItem';
import CalendarView from '../components/CalendarView';
import Drawer from '../components/Drawer';
import { useTransactions, useAccounts, useCategories, useAllTransactions, formatINR, getCategoryById, getAccountById, useUIStore } from '../hooks';
import { deleteTransaction } from '../db';
import type { ITransaction } from '../types';
import { motion, type Variants } from 'framer-motion';

const VIEW_TABS = ['Daily', 'Calendar', 'Monthly', 'Summary', 'Description'];

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export default function TransactionsList() {
  const [monthDate, setMonthDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('Daily');
  const [calSelectedDate, setCalSelectedDate] = useState<Date | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  const { isScrollingDown, setIsScrollingDown } = useUIStore();
  const lastScrollY = useRef(0);
  const scrollLock = useRef(false);

  const rawTransactions = useTransactions(monthDate);
  const allTransactions = useAllTransactions();
  const categories = useCategories();
  const accounts = useAccounts();

  // Apply filters
  const transactions = useMemo(() => {
    return rawTransactions.filter(tx => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterAccount !== 'all' && tx.accountId !== filterAccount && tx.toAccountId !== filterAccount) return false;
      if (filterCategory !== 'all' && tx.category !== filterCategory) return false;
      return true;
    });
  }, [rawTransactions, filterType, filterAccount, filterCategory]);

  // ── Search: searches ALL transactions (across all months) ──
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allTransactions.filter(tx => {
      const cat = getCategoryById(categories, tx.category);
      const acc = getAccountById(accounts, tx.accountId);
      const toAcc = tx.toAccountId ? getAccountById(accounts, tx.toAccountId) : undefined;
      const searchable = [
        cat?.name ?? '',
        acc?.name ?? '',
        toAcc?.name ?? '',
        tx.note,
        tx.description,
        tx.type,
        tx.amount.toString(),
        format(new Date(tx.date), 'dd MMM yyyy'),
      ].join(' ').toLowerCase();
      return searchable.includes(q);
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, searchQuery, categories, accounts]);

  // Compute running balances for all transactions sorted ascending
  const runningBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    accounts.forEach(a => { balances[a.id] = a.balance; }); // Initial balances
    const txMap: Record<string, number> = {};

    // Sort all transactions ascending to compute running balances chronologically
    const sorted = [...allTransactions].sort((a, b) => {
      const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return allTransactions.indexOf(a) - allTransactions.indexOf(b); // Tie-breaker: insertion order ascending
    });

    sorted.forEach(tx => {
      if (tx.type === 'income') {
        balances[tx.accountId] = (balances[tx.accountId] || 0) + tx.amount;
      } else if (tx.type === 'expense') {
        balances[tx.accountId] = (balances[tx.accountId] || 0) - tx.amount;
      } else if (tx.type === 'transfer') {
        balances[tx.accountId] = (balances[tx.accountId] || 0) - tx.amount;
        if (tx.toAccountId) {
          balances[tx.toAccountId] = (balances[tx.toAccountId] || 0) + tx.amount;
        }
      }
      txMap[tx.id] = balances[tx.accountId] || 0;
    });
    return txMap;
  }, [allTransactions, accounts]);

  // Aggregate for topbar
  const { totalIncome, totalExpense } = useMemo(() => {
    let inc = 0, exp = 0;
    transactions.forEach(tx => {
      if (tx.type === 'income') inc += tx.amount;
      if (tx.type === 'expense') exp += tx.amount;
    });
    return { totalIncome: inc, totalExpense: exp };
  }, [transactions]);

  // Group by date descending
  const grouped = useMemo(() => {
    const map: Record<string, ITransaction[]> = {};
    transactions.forEach(tx => {
      const key = tx.date.split('T')[0];
      (map[key] ??= []).push(tx);
    });

    // Sort groups descending by date
    const sortedKeys = Object.keys(map).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const sortedGroups: Record<string, ITransaction[]> = {};
    sortedKeys.forEach(k => {
      // Sort transactions WITHIN day descending by date
      sortedGroups[k] = map[k].sort((a, b) => {
        const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (timeDiff !== 0) return timeDiff;
        return allTransactions.indexOf(b) - allTransactions.indexOf(a); // Tie-breaker: insertion order descending
      });
    });
    return sortedGroups;
  }, [transactions, allTransactions]);

  // Filter for calendar day selection
  const filteredByCalDay = useMemo(() => {
    if (!calSelectedDate) return transactions;
    return transactions.filter(tx => isSameDay(new Date(tx.date), calSelectedDate));
  }, [transactions, calSelectedDate]);

  const filteredGrouped = useMemo(() => {
    const map: Record<string, ITransaction[]> = {};
    const sorted = [...filteredByCalDay].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    sorted.forEach(tx => {
      const key = tx.date.split('T')[0];
      (map[key] ??= []).push(tx);
    });
    return map;
  }, [filteredByCalDay]);

  const handlePrev = () => setMonthDate(d => subMonths(d, 1));
  const handleNext = () => setMonthDate(d => addMonths(d, 1));

  const handleDeleteTx = async (id: string) => {
    if (confirm('Delete this transaction?')) {
      await deleteTransaction(id);
    }
  };

  // ── Search Overlay ──
  if (searchOpen) {
    return (
      <div className="flex flex-col h-full w-full bg-bg">
        {/* Search Bar */}
        <div
          className="px-4 pb-3 shrink-0 bg-bg border-b border-border flex items-center gap-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex-1 input-premium-wrapper pr-2 py-2">
            <Search size={18} className="text-text-secondary shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-tertiary"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1.5 hover:bg-white/5 rounded-2xl transition-colors ml-1">
                <X size={16} className="text-text-secondary hover:text-text-primary transition-colors" />
              </button>
            )}
          </div>
          <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-coral font-semibold text-sm">
            Cancel
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.trim() === '' ? (
            <div className="flex items-center justify-center h-40 text-text-secondary text-sm text-center px-8">
              Type to search by category, account, note, amount…
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-text-secondary text-sm text-center px-8">
              No transactions found for "{searchQuery}"
            </div>
          ) : (
            <>
              <div className="px-4 py-2 text-xs text-text-tertiary">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </div>
              <motion.div variants={listVariants} initial="hidden" animate="visible">
                {searchResults.map(tx => (
                  <div key={tx.id} className="px-4 mb-3">
                    <TransactionItem
                      transaction={tx}
                      categories={categories}
                      accounts={accounts}
                      runningBalance={runningBalances[tx.id]}
                      onLongPress={() => setTxToDelete(tx.id)}
                    />
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      <TopBar
        title={format(monthDate, 'MMM yyyy')}
        onPrev={handlePrev}
        onNext={handleNext}
        income={totalIncome}
        expense={totalExpense}
        showSearch
        onSearch={() => setSearchOpen(true)}
        showFilter
        onFilter={() => setFilterOpen(true)}
        isScrolled={isScrollingDown}
      />

      <Tabs tabs={VIEW_TABS} active={activeTab} onChange={setActiveTab} />

      <div 
        className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const currentScrollY = target.scrollTop;
          
          if (scrollLock.current) {
            lastScrollY.current = currentScrollY;
            return;
          }
          
          if (currentScrollY > lastScrollY.current + 15 && currentScrollY > 60) {
            setIsScrollingDown(true);
            lastScrollY.current = currentScrollY;
            scrollLock.current = true;
            setTimeout(() => { scrollLock.current = false; }, 350);
          } else if (currentScrollY < lastScrollY.current - 15 || currentScrollY <= 60) {
            setIsScrollingDown(false);
            lastScrollY.current = currentScrollY;
            scrollLock.current = true;
            setTimeout(() => { scrollLock.current = false; }, 350);
          }
        }}
      >
        {/* ─── Daily View ─── */}
        {activeTab === 'Daily' && (
          <div className="fade-in">
            {Object.keys(grouped).length === 0 && (
              <div className="flex flex-col items-center justify-center h-52 text-text-secondary text-sm gap-2">
                <span className="text-4xl">💸</span>
                <span>No transactions this month</span>
                <span className="text-xs text-text-tertiary">Tap + to add your first entry</span>
              </div>
            )}
            {Object.entries(grouped).map(([dateKey, txs]) => {
              const d = new Date(dateKey);
              let dayInc = 0, dayExp = 0;
              txs.forEach(tx => {
                if (tx.type === 'income') dayInc += tx.amount;
                if (tx.type === 'expense') dayExp += tx.amount;
              });

              return (
                <div key={dateKey}>
                  {/* Day header */}
                  <div className="flex items-center justify-between px-6 pt-4 pb-2 bg-transparent">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-text-primary">{format(d, 'dd')}</span>
                      <span className="text-[10px] font-bold bg-coral/10 text-coral px-2 py-0.5 rounded-2xl uppercase tracking-wider">
                        {format(d, 'EEE')}
                      </span>
                    </div>
                    <div className="flex gap-4 text-xs font-bold">
                      {dayInc > 0 && <span className="text-income">+{formatINR(dayInc)}</span>}
                      {dayExp > 0 && <span className="text-expense">-{formatINR(dayExp)}</span>}
                    </div>
                  </div>

                  {/* Transactions with swipe-to-delete */}
                  <motion.div variants={listVariants} initial="hidden" animate="visible">
                    {txs.map(tx => (
                      <div key={tx.id} className="px-4 mb-3">
                        <TransactionItem
                          transaction={tx}
                          categories={categories}
                          accounts={accounts}
                          runningBalance={runningBalances[tx.id]}
                          onLongPress={() => setTxToDelete(tx.id)}
                        />
                      </div>
                    ))}
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Calendar View ─── */}
        {activeTab === 'Calendar' && (
          <div className="fade-in">
            <CalendarView
              transactions={transactions}
              categories={categories}
              accounts={accounts}
              monthDate={monthDate}
              selectedDate={calSelectedDate}
              onSelectDate={setCalSelectedDate}
            />

            <div className="mt-4 px-4">
              {Object.entries(filteredGrouped).map(([dateKey, txs]) => {
                const d = new Date(dateKey);
                return (
                  <div key={dateKey} className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-lg font-bold tracking-tight text-text-primary">{format(d, 'dd')}</span>
                      <span className="text-[11px] font-bold tracking-widest uppercase bg-elevated text-text-secondary px-2.5 py-1 rounded-2xl">
                        {format(d, 'EEEE')}
                      </span>
                      <div className="h-px bg-border/50 flex-1 ml-2" />
                    </div>
                    <div className="pt-2">
                      {txs.map(tx => (
                        <div key={tx.id} className="px-4 mb-3">
                          <TransactionItem
                            transaction={tx}
                            categories={categories}
                            accounts={accounts}
                            runningBalance={runningBalances[tx.id]}
                            onLongPress={() => setTxToDelete(tx.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Monthly View ─── */}
        {activeTab === 'Monthly' && (
          <div className="fade-in p-4">
            <div className="bg-surface rounded-2xl p-4 border border-border">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Monthly Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Income</span>
                  <span className="text-income font-semibold">{formatINR(totalIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total Expense</span>
                  <span className="text-expense font-semibold">{formatINR(totalExpense)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between">
                  <span className="font-semibold">Net Balance</span>
                  <span className={`font-bold ${totalIncome - totalExpense >= 0 ? 'text-income' : 'text-expense'}`}>
                    {formatINR(totalIncome - totalExpense)}
                  </span>
                </div>
              </div>
            </div>

            {/* Expense by category */}
            <h3 className="text-sm font-semibold text-text-secondary mt-6 mb-3">Expenses by Category</h3>
            <div className="space-y-2">
              {(() => {
                const catMap: Record<string, { name: string; icon: string; amount: number }> = {};
                transactions.forEach(tx => {
                  if (tx.type === 'expense') {
                    const cat = categories.find(c => c.id === tx.category);
                    const key = tx.category || 'other';
                    if (!catMap[key]) catMap[key] = { name: cat?.name ?? 'Other', icon: cat?.icon ?? '📝', amount: 0 };
                    catMap[key].amount += tx.amount;
                  }
                });
                const items = Object.values(catMap).sort((a, b) => b.amount - a.amount);
                if (items.length === 0) return <p className="text-text-tertiary text-sm">No expenses this month</p>;
                return items.map(item => (
                  <div key={item.name} className="flex items-center justify-between bg-surface rounded-2xl px-4 py-3 border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-expense font-semibold">{formatINR(item.amount)}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ─── Summary View ─── */}
        {activeTab === 'Summary' && (
          <div className="fade-in p-4 space-y-3">
            {(() => {
              const catMap: Record<string, { name: string; icon: string; income: number; expense: number }> = {};
              transactions.forEach(tx => {
                if (tx.type === 'income' || tx.type === 'expense') {
                  const cat = categories.find(c => c.id === tx.category);
                  const key = tx.category || 'other';
                  if (!catMap[key]) catMap[key] = { name: cat?.name ?? 'Other', icon: cat?.icon ?? '📝', income: 0, expense: 0 };
                  if (tx.type === 'income') catMap[key].income += tx.amount;
                  if (tx.type === 'expense') catMap[key].expense += tx.amount;
                }
              });
              const items = Object.values(catMap).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
              if (items.length === 0) return <p className="text-text-tertiary text-sm text-center pt-10">No data this month</p>;
              return items.map(item => (
                <div key={item.name} className="bg-surface rounded-2xl px-4 py-3 border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <div className="flex gap-3 text-sm">
                      {item.income > 0 && <span className="text-income font-medium">+{formatINR(item.income)}</span>}
                      {item.expense > 0 && <span className="text-expense font-medium">-{formatINR(item.expense)}</span>}
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* ─── Description View ─── */}
        {activeTab === 'Description' && (
          <div className="fade-in p-4 space-y-2">
            {transactions.filter(tx => tx.note || tx.description).length === 0 ? (
              <div className="text-center text-text-secondary text-sm pt-10">No notes or descriptions this month</div>
            ) : (
              transactions
                .filter(tx => tx.note || tx.description)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(tx => {
                  const cat = categories.find(c => c.id === tx.category);
                  return (
                    <div key={tx.id} className="bg-surface rounded-2xl px-4 py-3 border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{cat?.icon ?? '📝'}</span>
                        <span className="text-sm font-medium">{cat?.name ?? 'Transfer'}</span>
                        <span className={`text-xs ml-auto font-medium ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">{format(new Date(tx.date), 'dd MMM yyyy')}</span>
                      </div>
                      {tx.note && <p className="text-sm text-text-secondary mt-1">{tx.note}</p>}
                      {tx.description && <p className="text-xs text-text-tertiary mt-0.5">{tx.description}</p>}
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <Drawer open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Transactions">
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Type</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="input-premium"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Account</label>
            <select
              value={filterAccount}
              onChange={e => setFilterAccount(e.target.value)}
              className="input-premium"
            >
              <option value="all">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Category</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="input-premium"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setFilterType('all');
              setFilterAccount('all');
              setFilterCategory('all');
            }}
            className="w-full bg-surface text-text-primary border border-border font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform mt-4"
          >
            Reset Filters
          </button>
        </div>
      </Drawer>

      {/* ─── Delete Confirmation Drawer ─── */}
      <Drawer open={!!txToDelete} onClose={() => setTxToDelete(null)} title="Transaction Options">
        <div className="p-4 space-y-4">
          <button
            onClick={() => {
              if (txToDelete) handleDeleteTx(txToDelete);
              setTxToDelete(null);
            }}
            className="w-full bg-expense/10 text-expense py-4 rounded-2xl font-bold active:scale-95 transition-transform"
          >
            Delete Transaction
          </button>
          <button
            onClick={() => setTxToDelete(null)}
            className="w-full bg-surface text-text-primary py-4 rounded-2xl font-bold active:scale-95 transition-transform"
          >
            Cancel
          </button>
        </div>
      </Drawer>
    </div>
  );
}
