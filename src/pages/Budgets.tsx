import { useState, useMemo } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import TopBar from '../components/TopBar';
import Drawer from '../components/Drawer';
import { db } from '../db';
import { useBudgets, useTransactions, useCategories, formatINR } from '../hooks';
import { Plus, Trash2 } from 'lucide-react';
import type { IBudget } from '../types';

export default function Budgets() {
  const [monthDate, setMonthDate] = useState(new Date());
  const yearMonth = format(monthDate, 'yyyy-MM');
  
  const budgets = useBudgets(yearMonth);
  const transactions = useTransactions(monthDate);
  const categories = useCategories();

  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('overall');
  const [amount, setAmount] = useState<string>('');

  const isBudgetValid = parseFloat(amount) > 0 && !!selectedCategory;

  // Calculations
  const expenses = useMemo(() => transactions.filter(t => t.type === 'expense'), [transactions]);
  const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = useMemo(() => {
    return transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const spentByCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    expenses.forEach(tx => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    });
    return acc;
  }, [expenses]);

  const handlePrev = () => setMonthDate(d => subMonths(d, 1));
  const handleNext = () => setMonthDate(d => addMonths(d, 1));

  const handleSaveBudget = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    // Check if this budget already exists
    const existing = budgets.find(b => b.categoryId === selectedCategory);
    if (existing) {
      await db.budgets.update(existing.id, { amount: numAmount });
    } else {
      await db.budgets.add({
        id: uuidv4(),
        categoryId: selectedCategory,
        amount: numAmount,
        yearMonth
      });
    }
    setShowAddDrawer(false);
    setAmount('');
    setSelectedCategory('overall');
  };

  const handleDeleteBudget = async (id: string) => {
    await db.budgets.delete(id);
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-expense';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-income';
  };

  const renderBudgetCard = (budget: IBudget) => {
    const isOverall = budget.categoryId === 'overall';
    const cat = isOverall ? null : categories.find(c => c.id === budget.categoryId);
    const spent = isOverall ? totalSpent : (spentByCategory[budget.categoryId] || 0);
    const percentage = Math.min((spent / budget.amount) * 100, 100);
    const remaining = budget.amount - spent;
    
    return (
      <div key={budget.id} className="bg-surface rounded-xl p-4 border border-border group relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{isOverall ? '🌍' : cat?.icon ?? '📝'}</span>
            <span className="font-semibold text-[15px]">{isOverall ? 'Overall Budget' : cat?.name ?? 'Unknown'}</span>
          </div>
          <button 
            onClick={() => handleDeleteBudget(budget.id)}
            className="text-expense/50 hover:text-expense p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="flex items-end justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-xs text-text-tertiary">Spent</span>
            <span className={`font-semibold ${spent > budget.amount ? 'text-expense' : ''}`}>
              {formatINR(spent)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-text-tertiary">Budget</span>
            <span className="font-semibold text-text-secondary">{formatINR(budget.amount)}</span>
          </div>
        </div>

        <div className="h-2 w-full bg-elevated rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getProgressBarColor(percentage)}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <div className="mt-2 text-[11px] text-text-tertiary flex justify-between">
          <span>{percentage.toFixed(1)}% used</span>
          {remaining >= 0 ? (
            <span className="text-income">{formatINR(remaining)} left</span>
          ) : (
            <span className="text-expense">{formatINR(Math.abs(remaining))} over</span>
          )}
        </div>
      </div>
    );
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      <TopBar
        title={format(monthDate, 'MMM yyyy')}
        onPrev={handlePrev}
        onNext={handleNext}
        income={totalIncome}
        expense={totalSpent}
      />

      <div className="flex-1 overflow-y-auto px-4 space-y-4 fade-in">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Budgets</h2>
          <button 
            onClick={() => setShowAddDrawer(true)}
            className="flex items-center gap-1 text-sm font-semibold text-coral active:scale-95 transition-transform"
          >
            <Plus size={16} /> Add Budget
          </button>
        </div>

        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-secondary text-sm gap-2 bg-surface rounded-xl border border-border">
            <span className="text-4xl">🎯</span>
            <span>No budgets set for this month</span>
            <span className="text-xs text-text-tertiary text-center px-4">
              Set an overall budget or category budgets to keep your spending in check.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {budgets.map(renderBudgetCard)}
          </div>
        )}
      </div>

      {/* Add Budget Drawer */}
      <Drawer open={showAddDrawer} onClose={() => setShowAddDrawer(false)} title="Set Budget">
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Budget Type</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="input-premium"
            >
              <option value="overall">🌍 Overall Budget</option>
              {expenseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Amount</label>
            <div className="input-premium-wrapper">
              <span className="text-lg font-bold text-text-secondary mr-2">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="font-semibold text-lg"
                autoFocus
              />
            </div>
          </div>

          <button
            onClick={handleSaveBudget}
            disabled={!isBudgetValid}
            className="w-full bg-coral text-bg py-4 rounded-xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            Set Budget
          </button>
        </div>
      </Drawer>
    </div>
  );
}
