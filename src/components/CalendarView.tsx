import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
import type { ITransaction, ICategory, IAccount } from '../types';
import { motion, type Variants } from 'framer-motion';

interface Props {
  transactions: ITransaction[];
  categories: ICategory[];
  accounts: IAccount[];
  monthDate: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.02 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  }
};

export default function CalendarView({ transactions, monthDate, selectedDate, onSelectDate }: Props) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [monthDate]);

  // Pre-compute per-day totals
  const dayData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(tx => {
      const key = format(new Date(tx.date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = { income: 0, expense: 0 };
      if (tx.type === 'income') map[key].income += tx.amount;
      if (tx.type === 'expense') map[key].expense += tx.amount;
    });
    return map;
  }, [transactions]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="px-4 pt-2 mb-6"
    >
      <div className="bg-surface/60 backdrop-blur-2xl border border-border/50 rounded-3xl p-4 shadow-sm relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-coral/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Header */}
        <div className="grid grid-cols-7 mb-3 relative z-10">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] text-text-tertiary uppercase tracking-widest font-bold">{d}</div>
          ))}
        </div>

        {/* Days Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-7 gap-1.5 relative z-10"
        >
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd');
            const data = dayData[key];
            const inMonth = isSameMonth(day, monthDate);
            const selected = selectedDate && isSameDay(day, selectedDate);
            const today = isToday(day);

            return (
              <motion.button
                variants={itemVariants}
                whileTap={{ scale: 0.9 }}
                key={key}
                onClick={() => onSelectDate(day)}
                className={`flex flex-col items-center justify-start pt-2 pb-1 rounded-2xl transition-colors min-h-[52px]
                  ${!inMonth ? 'opacity-20' : ''}
                  ${selected ? 'bg-coral text-bg shadow-md shadow-coral/20 scale-105' : 'bg-elevated/40 border border-border/30'}
                  ${today && !selected ? 'border-coral/50' : ''}`}
              >
                <span className={`text-[13px] font-bold ${selected ? 'text-bg' : today ? 'text-coral' : 'text-text-primary'}`}>
                  {format(day, 'd')}
                </span>
                <div className="flex flex-col gap-0.5 mt-1 w-full px-1">
                  {data && data.income > 0 && (
                    <div className={`text-[8px] font-bold leading-none text-center ${selected ? 'text-bg/80' : 'text-income/80'}`}>
                      +{data.income >= 1000 ? `${(data.income / 1000).toFixed(1)}k` : data.income}
                    </div>
                  )}
                  {data && data.expense > 0 && (
                    <div className={`text-[8px] font-bold leading-none text-center ${selected ? 'text-bg/80' : 'text-expense/80'}`}>
                      -{data.expense >= 1000 ? `${(data.expense / 1000).toFixed(1)}k` : data.expense}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
