import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Filter, Moon, Sun, Bell, ShieldCheck, ChevronRight, PieChart, FileDown, FileUp, Trash2, Footprints, ExternalLink, Repeat, MessageSquareText } from 'lucide-react';
import Drawer from '../components/Drawer';
import { resetAllData, db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { useAllTransactions, useAccounts, useCategories, useTheme } from '../hooks';
import { motion, type Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  }
};

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) return; // Only header or empty
      
      const parsedTransactions = [];
      const allAccs = await db.accounts.toArray();
      const allCats = await db.categories.toArray();
      
      for (let i = 1; i < lines.length; i++) {
        const row = [];
        let cur = '';
        let inQuote = false;
        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            row.push(cur);
            cur = '';
          } else {
            cur += char;
          }
        }
        row.push(cur);
        
        if (row.length < 5) continue;
        
        const [dateStr, type, amountStr, catName, accName, note, description] = row;
        const lowerType = type.toLowerCase();
        
        // Find or create account
        let account = allAccs.find(a => a.name.toLowerCase() === accName.toLowerCase());
        if (!account && accName) {
          account = { id: uuidv4(), name: accName, group: 'Others', balance: 0, settlementDate: 1, paymentDate: 1 };
          await db.accounts.add(account);
          allAccs.push(account);
        }
        
        // Find or create category
        let category = allCats.find(c => c.name.toLowerCase() === catName.toLowerCase() && c.type === lowerType);
        if (!category && catName && lowerType !== 'transfer') {
          category = { id: uuidv4(), name: catName, type: lowerType as any, icon: '📦' };
          await db.categories.add(category);
          allCats.push(category);
        }

        const dateParts = dateStr.split('/');
        let isoDate = new Date().toISOString();
        if (dateParts.length === 3) {
          // Assuming DD/MM/YYYY
          isoDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`).toISOString();
        } else if (!isNaN(Date.parse(dateStr))) {
          isoDate = new Date(dateStr).toISOString();
        }

        parsedTransactions.push({
          id: uuidv4(),
          type: lowerType as any,
          amount: parseFloat(amountStr) || 0,
          date: isoDate,
          category: category?.id || '',
          accountId: account?.id || '',
          note: note || '',
          description: description || '',
          createdAt: Date.now() + i
        });
      }
      
      if (parsedTransactions.length > 0) {
        await db.transactions.bulkAdd(parsedTransactions);
        alert(`Successfully imported ${parsedTransactions.length} transactions!`);
      } else {
        alert('No valid transactions found to import.');
      }
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const navigate = useNavigate();

  const menuItems: Array<{ icon: any; label: string; onClick: () => void }> = [
    { icon: PieChart, label: 'Manage Budgets', onClick: () => navigate('/budgets') },
    { icon: Footprints, label: 'Savings Goals', onClick: () => navigate('/goals') },
    { icon: Repeat, label: 'Subscriptions & Bills', onClick: () => navigate('/subscriptions') },
    { icon: MessageSquareText, label: 'Import from SMS', onClick: () => navigate('/sms-import') },
    { icon: FileDown, label: 'Export to CSV', onClick: handleExportCSV },
    { icon: FileUp, label: 'Import from CSV', onClick: () => fileInputRef.current?.click() },
    { icon: Filter, label: 'Filter Transactions', onClick: () => setShowFilterDrawer(true) },
    { icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Light Theme' : 'Dark Theme', onClick: toggleTheme },
    { icon: Bell, label: 'Notifications', onClick: () => navigate('/notifications') },
    { icon: ShieldCheck, label: 'Privacy & Security', onClick: () => navigate('/privacy-security') },
    { icon: ExternalLink, label: 'To-Do List (Weekstack/Hepta)', onClick: () => window.open('https://weekstack-web.vercel.app/', '_blank') },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      <input 
        type="file" 
        accept=".csv" 
        ref={fileInputRef} 
        onChange={handleImportCSV} 
        className="hidden" 
      />
      {/* Header */}
      <div className="bg-bg pt-[env(safe-area-inset-top)] shrink-0">
        <div className="flex items-center px-4 h-12 gap-3">
          <Settings size={22} className="text-text-secondary" />
          <span className="text-lg font-semibold">More</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* App Info Card */}
        <div className="mx-4 mt-6 p-5 bg-surface/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-coral/10 rounded-2xl blur-3xl -mr-10 -mt-10 pointer-events-none" />
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Manifest</h3>
              <p className="text-[13px] text-text-secondary font-medium mt-0.5">Manifest your wealth</p>
            </div>
          </div>
          <div className="flex gap-3 relative z-10">
            <div className="flex-1 bg-elevated/50 px-3 py-2 rounded-2xl border border-border/50 text-center">
              <span className="block text-[15px] font-bold text-text-primary">{transactions.length}</span>
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold mt-0.5 block">Transactions</span>
            </div>
            <div className="flex-1 bg-elevated/50 px-3 py-2 rounded-2xl border border-border/50 text-center">
              <span className="block text-[15px] font-bold text-text-primary">{accounts.length}</span>
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-bold mt-0.5 block">Accounts</span>
            </div>
          </div>
        </div>

        <div className="px-4 mt-8 mb-2">
          <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1">Settings & Features</span>
        </div>

        {/* Menu Items */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mx-4 bg-surface/50 rounded-2xl border border-border/50 shadow-sm overflow-hidden"
        >
          {menuItems.map((item, idx) => (
            <motion.button
              variants={itemVariants}
              whileTap={{ scale: 0.98, backgroundColor: 'rgba(0,0,0,0.05)' }}
              key={item.label}
              onClick={item.onClick}
              className={`flex items-center w-full px-5 py-4 transition-colors
                ${idx < menuItems.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              <div className="w-10 h-10 rounded-2xl bg-elevated flex items-center justify-center shrink-0 border border-border/50 mr-4 shadow-sm">
                <item.icon size={18} className="text-text-primary" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <span className="text-[15px] font-bold block">{item.label}</span>
              </div>
              <ChevronRight size={20} className="text-text-tertiary shrink-0 ml-2" />
            </motion.button>
          ))}
        </motion.div>

        {/* Danger zone */}
        <div className="px-4 mt-8 mb-2">
          <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1">Danger Zone</span>
        </div>
        <div className="mx-4 mb-4">
          <button
            onClick={async () => {
              if (confirm('This will delete ALL your data and reset the app. Are you sure?')) {
                await resetAllData();
                window.location.reload();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-expense/20 bg-expense/5 text-expense font-bold active:bg-expense/10 transition-colors"
          >
            <Trash2 size={18} />
            <span>Clear All Data</span>
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
                <button key={t} className="px-4 py-2 bg-elevated rounded-2xl text-sm active:bg-coral/20 transition-colors">
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">By Account</h4>
            <div className="flex flex-wrap gap-2">
              {accounts.map(a => (
                <button key={a.id} className="px-4 py-2 bg-elevated rounded-2xl text-sm active:bg-coral/20 transition-colors">
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">By Category</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c.id} className="px-3 py-2 bg-elevated rounded-2xl text-sm active:bg-coral/20 transition-colors flex items-center gap-1">
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="w-full bg-coral text-bg py-4 rounded-2xl font-semibold active:scale-[0.98] transition-transform mt-2">
            Apply Filter
          </button>
        </div>
      </Drawer>
    </div>
  );
}
