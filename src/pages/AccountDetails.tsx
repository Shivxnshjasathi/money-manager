import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAccountBalances, useAllTransactions, useCategories, useAccounts, formatINR } from '../hooks';
import TransactionItem from '../components/TransactionItem';
import Drawer from '../components/Drawer';
import { db } from '../db';
import { playFeedback } from '../utils/feedback';

export default function AccountDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  
  // Pay Bill Drawer States
  const [showPayBill, setShowPayBill] = useState(false);
  const [payType, setPayType] = useState<'full' | 'custom'>('full');
  const [customPayAmount, setCustomPayAmount] = useState('');
  const [payFromAccount, setPayFromAccount] = useState<string>('');

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

  const outstandingBalance = account ? Math.abs(Math.min(0, account.computedBalance)) : 0;
  
  const handlePayBill = async () => {
    if (!account || !payFromAccount) return;
    const amount = payType === 'full' ? outstandingBalance : Number(customPayAmount);
    if (!amount || amount <= 0) return;

    await db.transactions.add({
      id: uuidv4(),
      type: 'transfer',
      amount,
      date: new Date().toISOString(),
      category: '',
      accountId: payFromAccount, // From
      toAccountId: account.id,   // To (Credit Card)
      note: 'Credit Card Bill Payment',
      description: `Paid bill for ${account.name}`,
    });

    playFeedback.success();
    setShowPayBill(false);
    setCustomPayAmount('');
  };

  if (!account) {
    return (
      <div className="flex flex-col h-full bg-bg">
        <div className="border-b border-border pt-[env(safe-area-inset-top)]">
          <div className="flex items-center px-4 h-14">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
            <span className="font-semibold text-lg ml-2">Account Not Found</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      {/* Header */}
      <div className="pt-[env(safe-area-inset-top)] bg-surface border-b border-border shrink-0 sticky top-0 z-10">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-primary active:scale-95 transition-transform">
            <ChevronLeft size={24} />
          </button>
          <div className="ml-2 flex-1">
            <h1 className="font-semibold text-lg">{account.name}</h1>
            <p className="text-xs text-text-tertiary">{account.group}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto fade-in">
        {/* Summary Card */}
        <div className="p-4">
          <div className="bg-surface border border-border rounded-2xl p-4">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <span className="text-sm text-text-secondary">
                  {account.group === 'Credit Card' ? 'Outstanding Balance' : 'Current Balance'}
                </span>
                <div className={`text-3xl font-bold mt-1 ${account.computedBalance < 0 ? 'text-expense' : 'text-income'}`}>
                  {formatINR(Math.abs(account.computedBalance))}
                </div>
              </div>
              {account.group === 'Credit Card' && outstandingBalance > 0 && (
                <button
                  onClick={() => setShowPayBill(true)}
                  className="bg-coral text-bg px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <CreditCard size={16} /> Pay Bill
                </button>
              )}
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
            <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-sm bg-surface rounded-2xl border border-border">
              <span className="text-3xl mb-2">📭</span>
              No transactions found
            </div>
          ) : (
            <div className="space-y-3">
              {accountTransactions.map(tx => (
                <TransactionItem
                  key={tx.id}
                  transaction={tx}
                  categories={categories}
                  accounts={accounts}
                  runningBalance={runningBalances[tx.id]}
                  onLongPress={() => setTxToDelete(tx.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* ─── Pay Bill Drawer ─── */}
      <Drawer open={showPayBill} onClose={() => setShowPayBill(false)} title="Pay Credit Card Bill">
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Amount to Pay</label>
            <div className="flex bg-elevated p-1 rounded-xl mb-3">
              <button 
                onClick={() => setPayType('full')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${payType === 'full' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary'}`}
              >
                Full Balance
              </button>
              <button 
                onClick={() => setPayType('custom')}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${payType === 'custom' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary'}`}
              >
                Other
              </button>
            </div>
            
            {payType === 'full' ? (
              <div className="text-center py-4 bg-surface rounded-2xl border border-border">
                <div className="text-sm text-text-secondary mb-1">You will pay</div>
                <div className="text-2xl font-bold text-income">{formatINR(outstandingBalance)}</div>
              </div>
            ) : (
              <div className="input-premium-wrapper">
                <span className="text-lg font-bold text-text-secondary mr-2">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={customPayAmount}
                  onChange={e => setCustomPayAmount(e.target.value)}
                  placeholder="0"
                  className="font-semibold text-lg"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Pay From Account</label>
            <select
              value={payFromAccount}
              onChange={e => setPayFromAccount(e.target.value)}
              className="input-premium"
            >
              <option value="" disabled>Select Account</option>
              {accountsWithBalances.filter(a => a.id !== id && a.group !== 'Credit Card').map(a => (
                <option key={a.id} value={a.id}>{a.name} ({formatINR(a.computedBalance)})</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handlePayBill}
            disabled={!payFromAccount || (payType === 'custom' && (!customPayAmount || Number(customPayAmount) <= 0))}
            className="w-full bg-coral text-bg py-4 rounded-2xl font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            Confirm Payment
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
