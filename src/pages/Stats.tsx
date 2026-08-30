import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { format, addMonths, subMonths } from 'date-fns';
import TopBar from '../components/TopBar';
import Tabs from '../components/Tabs';
import { useTransactions, useCategories, formatINR } from '../hooks';

const COLORS = [
  '#FF5A5F', '#FF9F43', '#FECA57', '#48DBFB', '#0ABDE3',
  '#10AC84', '#EE5A24', '#A29BFE', '#FD79A8', '#636E72',
];

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
          color: COLORS[i % COLORS.length],
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, subTab]);

  // Budget mock (monthly budget)
  const monthlyBudget = 5000;
  const budgetUsed = totalExpense;
  const budgetPercent = Math.min((budgetUsed / monthlyBudget) * 100, 100);

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
            className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200
              ${mainTab === tab ? 'bg-coral text-white' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Income / Expense sub-tab */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setSubTab('Income')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
            subTab === 'Income' ? 'text-income border-income' : 'text-text-secondary border-transparent'
          }`}
        >
          Income {formatINR(totalIncome)}
        </button>
        <button
          onClick={() => setSubTab('Expense')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
            subTab === 'Expense' ? 'text-expense border-expense' : 'text-text-secondary border-transparent'
          }`}
        >
          Exp. {formatINR(totalExpense)}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ─── Stats View ─── */}
        {mainTab === 'Stats' && (
          <div className="fade-in">
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
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatINR(value)}
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
            <div className="p-4 space-y-3">
              {chartData.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  {/* Color bar */}
                  <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  {/* Percent */}
                  <span className="text-sm font-bold w-12 text-right" style={{ color: item.color }}>
                    {item.percent.toFixed(1)}%
                  </span>
                  {/* Icon + Name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm font-medium truncate">{item.name}</span>
                  </div>
                  {/* Amount */}
                  <span className="text-sm font-semibold shrink-0">{formatINR(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Budget View ─── */}
        {mainTab === 'Budget' && (
          <div className="fade-in p-4 space-y-4">
            <div className="bg-surface rounded-xl p-4 border border-border">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-medium">Monthly Budget</span>
                <span className="text-sm text-text-secondary">{formatINR(monthlyBudget)}</span>
              </div>
              
              {/* Progress bar */}
              <div className="h-3 bg-elevated rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    budgetPercent > 80 ? 'bg-expense' : budgetPercent > 50 ? 'bg-[#FF9F43]' : 'bg-income'
                  }`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Spent: <span className="text-expense font-medium">{formatINR(budgetUsed)}</span></span>
                <span className="text-text-secondary">
                  Remaining: <span className="text-income font-medium">{formatINR(Math.max(0, monthlyBudget - budgetUsed))}</span>
                </span>
              </div>
            </div>

            {/* Per-category budgets */}
            {chartData.map(item => {
              const catBudget = monthlyBudget / chartData.length;
              const catPercent = Math.min((item.value / catBudget) * 100, 100);
              return (
                <div key={item.id} className="bg-surface rounded-xl p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{item.icon}</span>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-xs text-text-secondary">{formatINR(item.value)}</span>
                  </div>
                  <div className="h-2 bg-elevated rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${catPercent}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
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
