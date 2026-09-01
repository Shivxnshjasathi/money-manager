import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format, addMonths, subMonths } from 'date-fns';
import { motion, type Variants } from 'framer-motion';
import TopBar from '../components/TopBar';
import { useTransactions, useCategories, formatINR } from '../hooks';

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  }
};

// Use dynamic opacity based on index instead of hardcoded colors
const getSliceOpacity = (index: number) => Math.max(0.2, 1 - index * 0.15);

export default function Stats() {
  const [monthDate, setMonthDate] = useState(new Date());
  const [mainTab, setMainTab] = useState('Stats');
  const [subTab, setSubTab] = useState<'Expense' | 'Income'>('Expense');

  const transactions = useTransactions(monthDate);
  const categories = useCategories();

  const { totalIncome, totalExpense } = useMemo(() => {
    let inc = 0, exp = 0;
    transactions.forEach(tx => {
      if (tx.type === 'income') inc += tx.amount;
      if (tx.type === 'expense') exp += tx.amount;
    });
    return { totalIncome: inc, totalExpense: exp };
  }, [transactions]);

  // Aggregate by category
  const chartData = useMemo(() => {
    const type = subTab.toLowerCase() as 'income' | 'expense';
    const map: Record<string, number> = {};
    let total = 0;
    transactions.forEach(tx => {
      if (tx.type === type) {
        map[tx.category] = (map[tx.category] || 0) + tx.amount;
        total += tx.amount;
      }
    });
    return Object.entries(map)
      .map(([catId, amount], i) => {
        const cat = categories.find(c => c.id === catId);
        return {
          id: catId,
          name: cat?.name ?? 'Unknown',
          icon: cat?.icon ?? '📝',
          value: amount,
          percent: total > 0 ? (amount / total) * 100 : 0,
          opacity: getSliceOpacity(i),
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, subTab]);

  // Budget mock (monthly budget)
  const monthlyBudget = 5000;
  const budgetUsed = totalExpense;
  const budgetPercent = Math.min((budgetUsed / monthlyBudget) * 100, 100);

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      <TopBar
        title={format(monthDate, 'MMM yyyy')}
        onPrev={() => setMonthDate(d => subMonths(d, 1))}
        onNext={() => setMonthDate(d => addMonths(d, 1))}
        income={totalIncome}
        expense={totalExpense}
        showSearch
      />

      {/* Main Tab Selector (Pill style) */}
      <div className="flex justify-center py-2 gap-2 shrink-0">
        {['Stats', 'Budget', 'Note'].map(tab => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`px-5 py-1.5 rounded-2xl text-sm font-medium transition-all duration-200
              ${mainTab === tab ? 'bg-coral text-bg' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Income / Expense sub-tab */}
      <div className="flex px-4 py-2 gap-2 shrink-0 border-b border-border/50">
        <button
          onClick={() => setSubTab('Income')}
          className={`flex-1 py-2 text-[13px] font-bold rounded-2xl transition-all duration-300 ${subTab === 'Income' ? 'bg-income text-bg shadow-lg shadow-black/10 scale-105' : 'bg-surface/50 text-text-secondary hover:bg-surface'
            }`}
        >
          Income {formatINR(totalIncome)}
        </button>
        <button
          onClick={() => setSubTab('Expense')}
          className={`flex-1 py-2 text-[13px] font-bold rounded-2xl transition-all duration-300 ${subTab === 'Expense' ? 'bg-expense text-bg shadow-lg shadow-black/10 scale-105' : 'bg-surface/50 text-text-secondary hover:bg-surface'
            }`}
        >
          Exp. {formatINR(totalExpense)}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ─── Stats View ─── */}
        {mainTab === 'Stats' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            {/* Pie Chart */}
            <div className="h-64 bg-surface border-b border-border">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={50}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill="var(--app-text-primary)" fillOpacity={entry.opacity} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatINR(Number(value))}
                      contentStyle={{
                        backgroundColor: '#2C2C2E',
                        border: 'none',
                        borderRadius: '10px',
                        color: '#fff',
                        fontSize: '13px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                  No data for this period
                </div>
              )}
            </div>

            {/* Category Breakdown */}
            <motion.div 
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="p-4 space-y-3"
            >
              {chartData.map(item => (
                <motion.div 
                  key={item.id} 
                  variants={itemVariants}
                  className="flex items-center gap-3 bg-surface/50 p-3 rounded-2xl border border-border/30 backdrop-blur-sm"
                >
                  {/* Color bar */}
                  <div className="w-1 h-8 rounded-2xl shrink-0 bg-text-primary" style={{ opacity: item.opacity }} />
                  {/* Percent */}
                  <span className="text-sm font-bold w-12 text-right text-text-primary" style={{ opacity: item.opacity }}>
                    {item.percent.toFixed(1)}%
                  </span>
                  {/* Icon + Name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-[15px] font-medium truncate tracking-tight">{item.name}</span>
                  </div>
                  {/* Amount */}
                  <span className="text-[15px] font-bold shrink-0 tracking-tight">{formatINR(item.value)}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ─── Budget View ─── */}
        {mainTab === 'Budget' && (
          <motion.div 
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="p-4 space-y-4"
          >
            <motion.div variants={itemVariants} className="bg-surface/80 rounded-2xl p-5 border border-border shadow-sm">
              <div className="flex justify-between mb-4">
                <span className="text-[15px] font-medium text-text-secondary">Monthly Budget</span>
                <span className="text-[15px] font-bold">{formatINR(monthlyBudget)}</span>
              </div>

              {/* Progress bar */}
              <div className="h-4 bg-elevated rounded-2xl overflow-hidden mb-3 p-0.5 border border-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${budgetPercent}%` }}
                  transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.2 }}
                  className={`h-full rounded-2xl shadow-sm ${budgetPercent > 80 ? 'bg-expense' : budgetPercent > 50 ? 'bg-transfer' : 'bg-income'
                    }`}
                />
              </div>

              <div className="flex justify-between text-[13px]">
                <span className="text-text-secondary">Spent: <span className="text-expense font-bold">{formatINR(budgetUsed)}</span></span>
                <span className="text-text-secondary">
                  Left: <span className="text-income font-bold">{formatINR(Math.max(0, monthlyBudget - budgetUsed))}</span>
                </span>
              </div>
            </motion.div>

            {/* Per-category budgets */}
            {chartData.map(item => {
              const catBudget = monthlyBudget / chartData.length;
              const catPercent = Math.min((item.value / catBudget) * 100, 100);
              return (
                <motion.div key={item.id} variants={itemVariants} className="bg-surface/50 rounded-2xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-[15px] font-medium">{item.name}</span>
                    </div>
                    <span className="text-[14px] font-bold text-text-secondary">{formatINR(item.value)}</span>
                  </div>
                  <div className="h-2.5 bg-elevated rounded-2xl overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${catPercent}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.3 }}
                      className="h-full rounded-2xl bg-text-primary" 
                      style={{ opacity: item.opacity }} 
                    />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* ─── Note View ─── */}
        {mainTab === 'Note' && (
          <div className="fade-in p-4 text-center text-text-secondary text-sm pt-16">
            Notes will appear here
          </div>
        )}
      </div>
    </div>
  );
}
