import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Drawer from '../components/Drawer';
import { db } from '../db';
import type { AccountGroup } from '../types';
import { useAccountBalances, formatINR } from '../hooks';
import { motion, type Variants } from 'framer-motion';

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

const ACCOUNT_GROUPS_ORDER: AccountGroup[] = [
  'Cash', 'Bank Accounts', 'Credit Card', 'Card', 'Debit Card', 'Savings',
  'Top-Up/Prepaid', 'Investments', 'Overdrafts', 'Loan', 'Insurance', 'Others'
];

export default function Accounts() {
  const navigate = useNavigate();
  const accountsWithBalances = useAccountBalances();
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<AccountGroup>('Bank Accounts');
  const [newBalance, setNewBalance] = useState('');

  const noInitialBalance = newGroup === 'Credit Card' || newGroup === 'Cash' || newGroup === 'Others';
  const isAccountValid = newName.trim().length > 0 && (noInitialBalance || !isNaN(parseFloat(newBalance)));

  // Group accounts
  const grouped = accountsWithBalances.reduce<Record<string, typeof accountsWithBalances>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  // Totals
  let totalAssets = 0, totalLiabilities = 0;
  accountsWithBalances.forEach(a => {
    if (a.computedBalance >= 0) totalAssets += a.computedBalance;
    else totalLiabilities += Math.abs(a.computedBalance);
  });
  const netWorth = totalAssets - totalLiabilities;

  const handleAddAccount = async () => {
    if (!newName.trim()) return;
    await db.accounts.add({
      id: uuidv4(),
      name: newName.trim(),
      group: newGroup,
      balance: newGroup === 'Credit Card' ? 0 : (Number(newBalance) || 0),
      settlementDate: 1,
      paymentDate: 1,
    });
    setNewName('');
    setNewBalance('');
    setShowAddDrawer(false);
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      {/* Header */}
      <div className="bg-bg pt-[env(safe-area-inset-top)] shrink-0">
        <div className="flex items-center justify-between px-4 h-12">
          <span className="text-lg font-semibold">Accounts</span>
          <button
            onClick={() => setShowAddDrawer(true)}
            className="w-8 h-8 rounded-2xl bg-coral text-bg flex items-center justify-center active:scale-95 transition-transform"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Summary Bar */}
        <div className="flex justify-between px-6 py-3 border-b border-border text-sm">
          <div className="flex flex-col items-center">
            <span className="text-text-tertiary text-xs">Assets</span>
            <span className="text-income font-semibold">{formatINR(totalAssets)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-text-tertiary text-xs">Liabilities</span>
            <span className="text-expense font-semibold">{formatINR(totalLiabilities)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-text-tertiary text-xs">Total</span>
            <span className={`font-semibold ${netWorth >= 0 ? 'text-income' : 'text-expense'}`}>{formatINR(netWorth)}</span>
          </div>
        </div>
      </div>

      {/* Account Groups */}
      <div className="flex-1 overflow-y-auto px-4 pt-2">
        {accountsWithBalances.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-text-secondary text-sm gap-2">
            <span className="text-4xl">🏦</span>
            <span>No accounts added yet</span>
            <span className="text-xs text-text-tertiary">Tap + to add your first account</span>
          </div>
        )}
        <motion.div variants={listVariants} initial="hidden" animate="visible">
          {ACCOUNT_GROUPS_ORDER.filter(g => grouped[g]?.length).map(group => {
            const accs = grouped[group];
            const groupTotal = accs.reduce((s, a) => s + a.computedBalance, 0);

            return (
              <div key={group} className="mt-4 bg-surface/60 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/5">
                {/* Group Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-black/5 dark:bg-white/5 border-b border-white/5">
                  <span className="text-sm font-bold text-text-primary tracking-wide">{group}</span>
                  <span className={`text-sm font-bold ${groupTotal >= 0 ? 'text-income' : 'text-expense'}`}>
                    {formatINR(groupTotal)}
                  </span>
                </div>

                {/* Accounts */}
                <div className="flex flex-col py-2">
                  {accs.map(acc => (
                    <motion.button
                      variants={itemVariants}
                      layout
                      whileTap={{ scale: 0.98 }}
                      key={acc.id}
                      onClick={() => navigate(`/accounts/${acc.id}`)}
                      className="flex items-center justify-between w-full px-6 py-3.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <span className="text-[15px] font-semibold tracking-tight">{acc.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold tracking-tight text-[15px] ${acc.computedBalance >= 0 ? 'text-income' : 'text-expense'}`}>
                          {formatINR(acc.computedBalance)}
                        </span>
                        <ChevronRight size={16} className="text-text-tertiary" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Add Account Drawer */}
      <Drawer open={showAddDrawer} onClose={() => setShowAddDrawer(false)} title="New Account">
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Account Name</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. HDFC"
              className="input-premium"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Account Group</label>
            <select
              value={newGroup}
              onChange={e => setNewGroup(e.target.value as AccountGroup)}
              className="input-premium"
            >
              {ACCOUNT_GROUPS_ORDER.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {!noInitialBalance && (
            <div>
              <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Initial Balance</label>
              <div className="input-premium-wrapper">
                <span className="text-lg font-bold text-text-secondary mr-2">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={newBalance}
                  onChange={e => setNewBalance(e.target.value)}
                  placeholder="0"
                  className="font-semibold text-lg"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleAddAccount}
            disabled={!isAccountValid}
            className="w-full bg-coral text-bg py-4 rounded-2xl font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 disabled:active:scale-100"
          >
            Add Account
          </button>
        </div>
      </Drawer>
    </div>
  );
}
