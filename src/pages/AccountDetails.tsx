import { useParams, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useAccountBalances, useAllTransactions, useCategories, useAccounts, formatINR } from '../hooks';
import TransactionItem from '../components/TransactionItem';
import { db } from '../db';
import { Trash2 } from 'lucide-react';

export default function AccountDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const accountsWithBalances = useAccountBalances();
  const allTransactions = useAllTransactions();
  const categories = useCategories();
  const accounts = useAccounts();

  const account = accountsWithBalances.find(a => a.id === id);

  // Filter transactions for this account
  const accountTransactions = useMemo(() => {
    return allTransactions
      .filter(tx => tx.accountId === id || tx.toAccountId === id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, id]);

  const runningBalances = useMemo(() => {
    if (!account) return {};
    const balances: Record<string, number> = {};
    let currentBalance = account.balance;
    
    // accountTransactions is sorted descending (newest first). 
    // We need ascending to compute running balances from start.
    const sortedAsc = [...accountTransactions].reverse();
    
    sortedAsc.forEach(tx => {
      if (tx.type === 'income' && tx.accountId === id) {
        currentBalance += tx.amount;
      } else if (tx.type === 'expense' && tx.accountId === id) {
        currentBalance -= tx.amount;
      } else if (tx.type === 'transfer') {
        if (tx.accountId === id) currentBalance -= tx.amount;
        if (tx.toAccountId === id) currentBalance += tx.amount;
      }
      balances[tx.id] = currentBalance;
    });
    return balances;
  }, [accountTransactions, account, id]);

  // Calculate Income and Expense just for this account
  const { income, expense } = useMemo(() => {
    let inc = 0;
    let exp = 0;

    accountTransactions.forEach(tx => {
      if (tx.type === 'income' && tx.accountId === id) {
        inc += tx.amount;
      }
      if (tx.type === 'expense' && tx.accountId === id) {
        exp += tx.amount;
      }
      if (tx.type === 'transfer') {
        if (tx.accountId === id) {
          exp += tx.amount; // Outgoing transfer is like an expense from this account's perspective
        }
        if (tx.toAccountId === id) {
          inc += tx.amount; // Incoming transfer is like income
        }
      }
    });
    return { income: inc, expense: exp };
  }, [accountTransactions, id]);

  const handleDeleteTx = async (txId: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      await db.transactions.delete(txId);
    }
  };

  if (!account) {
    return (
      <div className="flex flex-col h-full bg-bg">
        <div className="flex items-center px-4 h-14 border-b border-border pt-[env(safe-area-inset-top)]">
          <button onClick={() => navigate('/accounts')} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <span className="font-semibold text-lg ml-2">Account Not Found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-bg">
      {/* Header */}
      <div className="flex items-center px-4 h-14 pt-[env(safe-area-inset-top)] bg-surface border-b border-border shrink-0 sticky top-0 z-10">
        <button onClick={() => navigate('/accounts')} className="p-2 -ml-2 text-text-primary active:scale-95 transition-transform">
          <ChevronLeft size={24} />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="font-semibold text-lg">{account.name}</h1>
          <p className="text-xs text-text-tertiary">{account.group}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto fade-in">
        {/* Summary Card */}
        <div className="p-4">
          <div className="bg-surface border border-border rounded-2xl p-4">
            <div className="mb-4">
              <span className="text-sm text-text-secondary">Current Balance</span>
              <div className={`text-3xl font-bold mt-1 ${account.computedBalance < 0 ? 'text-expense' : 'text-income'}`}>
                {formatINR(Math.abs(account.computedBalance))}
              </div>
            </div>
            
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">Total In</span>
                <span className="text-income font-semibold mt-0.5">{formatINR(income)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs text-text-secondary">Total Out</span>
                <span className="text-expense font-semibold mt-0.5">{formatINR(expense)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="px-4 pb-8 space-y-4">
          <h2 className="font-semibold text-sm text-text-secondary sticky top-0 bg-bg py-2 z-10">Transaction History</h2>
          
          {accountTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-sm bg-surface rounded-xl border border-border">
              <span className="text-3xl mb-2">📭</span>
              No transactions found
            </div>
          ) : (
            <div className="bg-surface rounded-xl border border-border overflow-hidden">
              {accountTransactions.map(tx => (
                <div key={tx.id} className="relative group border-b border-border/50 last:border-0">
                  <TransactionItem
                    transaction={tx}
                    categories={categories}
                    accounts={accounts}
                    runningBalance={runningBalances[tx.id]}
                  />
                  <button
                    onClick={() => handleDeleteTx(tx.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-expense/60 hover:text-expense transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
