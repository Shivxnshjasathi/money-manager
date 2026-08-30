import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Download, Filter, Moon, Sun, Bell, ShieldCheck, ChevronRight, Target } from 'lucide-react';
import Drawer from '../components/Drawer';
import { resetAllData } from '../db';
import { useAllTransactions, useAccounts, useCategories, useTheme } from '../hooks';

export default function More() {
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const transactions = useAllTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const { theme, toggleTheme } = useTheme();

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    if (transactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    const headers = ['Date', 'Type', 'Amount', 'Category', 'Account', 'Note', 'Description'];
    const rows = transactions.map(tx => {
      const cat = categories.find(c => c.id === tx.category);
      const acc = accounts.find(a => a.id === tx.accountId);
      return [
        new Date(tx.date).toLocaleDateString('en-IN'),
        tx.type,
        tx.amount.toString(),
        cat?.name ?? (tx.type === 'transfer' ? 'Transfer' : ''),
        acc?.name ?? '',
        tx.note,
        tx.description,
      ].map(v => `"${v}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `money-manager-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [transactions, categories, accounts]);

  const navigate = useNavigate();

  const menuItems: Array<{ icon: any; label: string; subtitle?: string; onClick: () => void }> = [
    { icon: Target, label: 'Manage Budgets', onClick: () => navigate('/budgets') },
    { icon: Target, label: 'Savings Goals', onClick: () => navigate('/goals') },
    { icon: Download, label: 'Export to CSV', onClick: handleExportCSV },
    { icon: Filter, label: 'Filter Transactions', onClick: () => setShowFilterDrawer(true) },
    { icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Light Theme' : 'Dark Theme', onClick: toggleTheme },
    { icon: Bell, label: 'Notifications', onClick: () => {} },
    { icon: ShieldCheck, label: 'Privacy & Security', onClick: () => {} },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="bg-bg pt-[env(safe-area-inset-top)] shrink-0">
        <div className="flex items-center px-4 h-12 gap-3">
          <Settings size={22} className="text-text-secondary" />
          <span className="text-lg font-semibold">More</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* App Info Card */}
        <div className="mx-4 mt-4 p-4 bg-surface rounded-2xl border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-coral flex items-center justify-center text-white text-xl font-bold">
              ₹
            </div>
            <div>
              <h3 className="font-semibold">Money Manager</h3>
              <p className="text-xs text-text-secondary">Track your finances offline</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="bg-elevated px-2 py-1 rounded-full text-text-secondary">
              {transactions.length} transactions
            </span>
            <span className="bg-elevated px-2 py-1 rounded-full text-text-secondary">
              {accounts.length} accounts
            </span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="mt-4 mx-4 bg-surface rounded-2xl border border-border overflow-hidden">
          {menuItems.map((item, idx) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`flex items-center justify-between w-full px-4 py-3.5 active:bg-elevated/50 transition-colors
                ${idx < menuItems.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className="text-text-secondary" />
                <div className="text-left">
                  <span className="text-sm">{item.label}</span>
                  {item.subtitle && <p className="text-[11px] text-text-tertiary">{item.subtitle}</p>}
                </div>
              </div>
              <ChevronRight size={16} className="text-text-tertiary" />
            </button>
          ))}
        </div>

        {/* Danger zone */}
        <div className="mt-4 mx-4 mb-8">
          <button
            onClick={async () => {
              if (confirm('This will delete ALL your data and reset the app. Are you sure?')) {
                await resetAllData();
                window.location.reload();
              }
            }}
            className="w-full py-3 rounded-xl border border-expense/30 text-expense text-sm font-medium
                       active:bg-expense/10 transition-colors"
          >
            Clear All Data
          </button>
        </div>
      </div>

      {/* Filter Drawer */}
      <Drawer open={showFilterDrawer} onClose={() => setShowFilterDrawer(false)} title="Filter Transactions">
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">By Type</h4>
            <div className="flex gap-2">
              {['All', 'Income', 'Expense', 'Transfer'].map(t => (
                <button key={t} className="px-4 py-2 bg-elevated rounded-xl text-sm active:bg-coral/20 transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">By Account</h4>
            <div className="flex flex-wrap gap-2">
              {accounts.map(a => (
                <button key={a.id} className="px-4 py-2 bg-elevated rounded-xl text-sm active:bg-coral/20 transition-colors">
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">By Category</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c.id} className="px-3 py-2 bg-elevated rounded-xl text-sm active:bg-coral/20 transition-colors flex items-center gap-1">
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="w-full bg-coral text-white py-4 rounded-xl font-semibold active:scale-[0.98] transition-transform mt-2">
            Apply Filter
          </button>
        </div>
      </Drawer>
    </div>
  );
}
