import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sankey, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PieChart as PieChartIcon, BarChart3 as BarChartIcon } from 'lucide-react';
import { format, addMonths, subMonths, subDays, eachDayOfInterval } from 'date-fns';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import TopBar from '../components/TopBar';
import { useTransactions, useCategories, formatINR, useAllTransactions } from '../hooks';

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
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [expandedSuperCategory, setExpandedSuperCategory] = useState<string | null>(null);

  const transactions = useTransactions(monthDate);
  const allTx = useAllTransactions();
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
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        return {
          id: catId,
          name: cat?.name || 'Other',
          value: amount,
          icon: cat?.icon || '📦',
          percent: total > 0 ? (amount / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.value - a.value)
      .map((item, i) => ({ ...item, opacity: getSliceOpacity(i) }));
  }, [transactions, subTab, categories]);

  const monthlyBudget = 50000;
  const budgetUsed = totalExpense;
  const budgetPercent = Math.min((budgetUsed / monthlyBudget) * 100, 100);

  // --- INSIGHTS DATA ---

  // Sankey Data (Current Month)
  const sankeyData = useMemo(() => {
    let inc = totalIncome;
    let expTotal = 0;
    const catMap: Record<string, number> = {};

    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const cat = categories.find(c => c.id === tx.category)?.name || 'Other';
        catMap[cat] = (catMap[cat] || 0) + tx.amount;
        expTotal += tx.amount;
      }
    });

    const nodes = [{ name: 'Income' }];
    const links: any[] = [];
    let nodeIndex = 1;

    Object.entries(catMap).forEach(([name, val]) => {
      nodes.push({ name });
      links.push({ source: 0, target: nodeIndex, value: val });
      nodeIndex++;
    });

    if (inc > expTotal) {
      nodes.push({ name: 'Savings/Unspent' });
      links.push({ source: 0, target: nodeIndex, value: inc - expTotal });
    }

    if (inc === 0 && expTotal > 0) {
      nodes[0].name = 'Expenses';
    }

    if (nodes.length === 1) return null;
    return { nodes, links };
  }, [transactions, categories, totalIncome]);

  // Heatmap Data (Last 90 days)
  const heatmapData = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 90);
    const days = eachDayOfInterval({ start, end });
    
    const dayMap: Record<string, number> = {};
    let maxSpend = 0;
    
    allTx.forEach(tx => {
      if (tx.type === 'expense') {
        const d = tx.date.split('T')[0];
        dayMap[d] = (dayMap[d] || 0) + tx.amount;
        if (dayMap[d] > maxSpend) maxSpend = dayMap[d];
      }
    });

    return {
      days: days.map(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        return {
          date: d,
          dateStr,
          amount: dayMap[dateStr] || 0
        };
      }),
      maxSpend
    };
  }, [allTx]);

  return (
    <div className="flex flex-col h-full bg-bg">
      <TopBar 
        title={format(monthDate, 'MMMM yyyy')}
        onPrev={() => setMonthDate(d => subMonths(d, 1))}
        onNext={() => setMonthDate(d => addMonths(d, 1))}
        stats={[
          { label: 'INCOME', value: totalIncome, color: 'text-income' },
          { label: 'EXPENSE', value: totalExpense, color: 'text-expense' },
          { label: 'TOTAL', value: totalIncome - totalExpense, color: totalIncome - totalExpense >= 0 ? 'text-income' : 'text-expense' }
        ]}
        showSearch
      />

      {/* Main Tab Selector (Pill style) */}
      <div className="flex overflow-x-auto scrollbar-hide py-3 px-4 gap-2 shrink-0 border-b border-border/50">
        {['Stats', 'Insights', 'Budget', 'Super Category', 'Note'].map(tab => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`whitespace-nowrap px-5 py-1.5 rounded-2xl text-[13px] font-bold transition-all duration-200 shrink-0
              ${mainTab === tab ? 'bg-coral text-bg shadow-sm' : 'text-text-secondary hover:text-text-primary bg-surface/50 hover:bg-surface'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Income / Expense sub-tab (Only for Stats view) */}
      {mainTab === 'Stats' && (
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
      )}

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
            {/* Chart Container */}
            <div className="relative h-64 bg-surface border-b border-border">
              <div className="absolute top-2 right-2 flex bg-bg rounded-lg p-0.5 border border-border z-10">
                <button
                  onClick={() => setChartType('pie')}
                  className={`p-1.5 rounded-md transition-colors ${chartType === 'pie' ? 'bg-surface text-coral shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
                >
                  <PieChartIcon size={16} />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`p-1.5 rounded-md transition-colors ${chartType === 'bar' ? 'bg-surface text-coral shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
                >
                  <BarChartIcon size={16} />
                </button>
              </div>

              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'pie' ? (
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
                  ) : (
                    <BarChart data={chartData} margin={{ top: 30, right: 20, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--app-text-tertiary)" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis 
                        stroke="var(--app-text-tertiary)" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000) + 'k' : v}`} 
                        width={45}
                      />
                      <Tooltip
                        formatter={(value: any) => formatINR(Number(value))}
                        contentStyle={{
                          backgroundColor: '#2C2C2E',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '13px',
                        }}
                        cursor={{ fill: 'var(--app-elevated)' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill="var(--app-text-primary)" fillOpacity={entry.opacity} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
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

        {/* ─── Insights View (Sankey & Heatmap) ─── */}
        {mainTab === 'Insights' && (
          <motion.div 
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="p-4 space-y-6"
          >
            {/* Heatmap Card */}
            <motion.div variants={itemVariants} className="bg-surface/50 rounded-2xl p-5 border border-border/50 backdrop-blur-sm">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Spending Heatmap (90 Days)</h3>
              
              <div className="w-full pb-2">
                <div 
                  className="grid grid-rows-7 gap-1 w-full"
                  style={{ gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)' }}
                >
                  {heatmapData.days.map(day => {
                    let bgClass = 'bg-surface border border-border/50'; // 0
                    if (day.amount > 0) {
                      const pct = day.amount / heatmapData.maxSpend;
                      if (pct > 0.75) bgClass = 'bg-expense';
                      else if (pct > 0.5) bgClass = 'bg-expense/80';
                      else if (pct > 0.25) bgClass = 'bg-expense/50';
                      else bgClass = 'bg-expense/30';
                    }
                    return (
                      <div 
                        key={day.dateStr}
                        className={`w-full aspect-square rounded-[2px] ${bgClass}`}
                        title={`${day.dateStr}: ${formatINR(day.amount)}`}
                      />
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end items-center gap-2 mt-2 text-[10px] text-text-tertiary uppercase font-bold">
                <span>Less</span>
                <div className="w-2.5 h-2.5 bg-surface border border-border/50 rounded-[2px]" />
                <div className="w-2.5 h-2.5 bg-expense/30 rounded-[2px]" />
                <div className="w-2.5 h-2.5 bg-expense/50 rounded-[2px]" />
                <div className="w-2.5 h-2.5 bg-expense/80 rounded-[2px]" />
                <div className="w-2.5 h-2.5 bg-expense rounded-[2px]" />
                <span>More</span>
              </div>
            </motion.div>

            {/* Sankey Flow Card */}
            <motion.div variants={itemVariants} className="bg-surface/50 rounded-2xl p-5 border border-border/50 backdrop-blur-sm h-80 flex flex-col">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 shrink-0">Money Flow</h3>
              <div className="flex-1 -mx-2">
                {sankeyData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <Sankey
                      data={sankeyData}
                      node={{ fill: 'var(--app-coral)', opacity: 0.8 }}
                      link={{ stroke: 'var(--app-coral)', strokeOpacity: 0.15 }}
                      margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                    >
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
                    </Sankey>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                    Not enough data for flow analysis
                  </div>
                )}
              </div>
            </motion.div>

          </motion.div>
        )}

        {/* ─── Super Category View ─── */}
        {mainTab === 'Super Category' && (
          <motion.div 
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="p-4 space-y-4"
          >
            {(() => {
              const scMap: Record<string, { total: number; categories: Record<string, number> }> = { 
                needs: { total: 0, categories: {} }, 
                wants: { total: 0, categories: {} }, 
                investment: { total: 0, categories: {} }, 
                uncategorized: { total: 0, categories: {} } 
              };
              let total = 0;
              transactions.forEach(tx => {
                if (tx.type === 'expense') {
                  const sc = tx.superCategory || 'uncategorized';
                  scMap[sc].total += tx.amount;
                  scMap[sc].categories[tx.category] = (scMap[sc].categories[tx.category] || 0) + tx.amount;
                  total += tx.amount;
                }
              });
              
              if (total === 0) {
                return <div className="text-center text-text-secondary text-sm pt-10">No expenses to categorize</div>;
              }

              const scIcons: Record<string, string> = {
                needs: '🏠',
                wants: '🛍️',
                investment: '📈',
                uncategorized: '❓'
              };

              return Object.entries(scMap)
                .filter(([_, data]) => data.total > 0)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([key, data], idx) => {
                  const percent = (data.total / total) * 100;
                  const isExpanded = expandedSuperCategory === key;
                  
                  return (
                    <motion.div 
                      key={key} 
                      variants={itemVariants} 
                      className={`bg-surface/50 rounded-2xl p-4 border transition-colors cursor-pointer active:scale-[0.98] ${isExpanded ? 'border-coral/40 shadow-sm' : 'border-border/50 hover:border-border'}`}
                      onClick={() => setExpandedSuperCategory(isExpanded ? null : key)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{scIcons[key] || '📦'}</span>
                          <span className="text-[15px] font-medium capitalize">{key}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-[14px] font-bold text-text-primary">{formatINR(data.total)}</div>
                          <div className="text-[11px] font-bold text-text-secondary">{percent.toFixed(1)}%</div>
                        </div>
                      </div>
                      <div className="h-2.5 bg-elevated rounded-2xl overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ type: 'spring', stiffness: 50, damping: 15, delay: 0.3 }}
                          className="h-full rounded-2xl bg-coral"
                          style={{ opacity: getSliceOpacity(idx) }}
                        />
                      </div>

                      {/* Expandable Category Breakdown */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                              {Object.entries(data.categories)
                                .sort((a, b) => b[1] - a[1])
                                .map(([catId, amount]) => {
                                  const catInfo = categories.find(c => c.id === catId);
                                  const catPercent = (amount / data.total) * 100;
                                  return (
                                    <div key={catId} className="flex items-center justify-between group">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-sm">
                                          {catInfo?.icon || '📦'}
                                        </div>
                                        <span className="text-[13px] text-text-secondary font-medium">{catInfo?.name || 'Other'}</span>
                                      </div>
                                      <div className="text-right flex flex-col">
                                        <span className="text-[13px] font-bold">{formatINR(amount)}</span>
                                        <span className="text-[10px] text-text-tertiary">{catPercent.toFixed(1)}%</span>
                                      </div>
                                    </div>
                                  );
                                })
                              }
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                });
            })()}
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
