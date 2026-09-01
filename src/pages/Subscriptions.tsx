import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import TopBar from '../components/TopBar';
import { Trash2, Repeat, Clock, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatINR } from '../hooks';

export default function Subscriptions() {
  const navigate = useNavigate();
  const recurringTxs = useLiveQuery(() => db.recurring_transactions.toArray(), []) ?? [];
  const categories = useLiveQuery(() => db.categories.toArray(), []) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray(), []) ?? [];

  // Calculate Monthly Burn Rate
  const monthlyBurnRate = recurringTxs.reduce((total, tx) => {
    if (tx.type !== 'expense') return total;
    let monthlyAmount = tx.amount;
    if (tx.frequency === 'daily') monthlyAmount = tx.amount * 30;
    if (tx.frequency === 'weekly') monthlyAmount = tx.amount * 4.33;
    if (tx.frequency === 'yearly') monthlyAmount = tx.amount / 12;
    return total + monthlyAmount;
  }, 0);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to cancel this subscription tracker?')) {
      await db.recurring_transactions.delete(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="pt-[env(safe-area-inset-top)] bg-surface shrink-0">
        <TopBar
          title="Subscriptions"
          onPrev={() => navigate(-1)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Burn Rate Card */}
        <div className="bg-expense/10 border border-expense/20 rounded-[32px] p-6 mb-8 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-expense/10 rounded-full blur-2xl -translate-y-10 translate-x-10" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-expense/10 rounded-full blur-xl translate-y-10 -translate-x-10" />
          
          <span className="text-xs font-bold tracking-widest text-expense uppercase mb-2 relative z-10">Monthly Burn Rate</span>
          <span className="text-4xl font-black text-text-primary mb-1 relative z-10 tracking-tight">
            {formatINR(monthlyBurnRate)}
          </span>
          <span className="text-xs text-text-secondary relative z-10">Fixed baseline expenses per month</span>
        </div>

        <h3 className="text-xs font-bold tracking-widest text-text-secondary uppercase mb-4">Active Subscriptions</h3>

        <div className="space-y-3">
          {recurringTxs.length === 0 ? (
            <div className="text-center py-10 bg-surface/50 rounded-2xl border border-border/50">
              <Clock className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary font-medium">No active subscriptions.</p>
              <p className="text-xs text-text-tertiary mt-1">Add a transaction and toggle "Recurring".</p>
            </div>
          ) : (
            recurringTxs.map(tx => {
              const cat = categories.find(c => c.id === tx.categoryId);
              const acc = accounts.find(a => a.id === tx.accountId);
              
              return (
                <div key={tx.id} className="bg-surface border border-border/50 p-4 rounded-2xl flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-full bg-elevated flex items-center justify-center text-xl shrink-0">
                    {cat?.icon || <CreditCard size={20} className="text-text-secondary" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm truncate">{tx.note || cat?.name || 'Subscription'}</span>
                      <span className={`font-bold text-sm shrink-0 ml-2 ${tx.type === 'income' ? 'text-income' : 'text-text-primary'}`}>
                        {formatINR(tx.amount)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                      <span className="flex items-center gap-1 font-medium capitalize">
                        <Repeat size={10} /> {tx.frequency}
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard size={10} /> {acc?.name || 'Account'}
                      </span>
                    </div>
                    {tx.description && (
                      <p className="text-[10px] text-text-tertiary mt-1 truncate">{tx.description}</p>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(tx.id)}
                    className="w-10 h-10 rounded-full bg-elevated text-text-tertiary flex items-center justify-center hover:text-expense hover:bg-expense/10 transition-colors shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
