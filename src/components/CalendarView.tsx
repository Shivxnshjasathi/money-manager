import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
import type { ITransaction, ICategory, IAccount } from '../types';

interface Props {
  transactions: ITransaction[];
  categories: ICategory[];
  accounts: IAccount[];
  monthDate: Date;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

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
    <div className="px-2 pt-2">
      {/* Header */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[11px] text-text-tertiary font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const key = format(day, 'yyyy-MM-dd');
          const data = dayData[key];
          const inMonth = isSameMonth(day, monthDate);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <button
              key={key}
              onClick={() => onSelectDate(day)}
              className={`flex flex-col items-center py-1.5 rounded-lg transition-colors min-h-[56px]
                ${!inMonth ? 'opacity-30' : ''}
                ${selected ? 'bg-coral/20 ring-1 ring-coral' : ''}
                ${today && !selected ? 'bg-elevated' : ''}
                active:bg-elevated/80`}
            >
              <span className={`text-xs font-medium ${selected ? 'text-coral' : today ? 'text-coral' : 'text-text-primary'}`}>
                {format(day, 'd')}
              </span>
              {data && data.income > 0 && (
                <span className="text-[9px] text-income font-medium mt-0.5 leading-tight">
                  {data.income >= 1000 ? `${(data.income / 1000).toFixed(1)}k` : data.income}
                </span>
              )}
              {data && data.expense > 0 && (
                <span className="text-[9px] text-expense font-medium leading-tight">
                  {data.expense >= 1000 ? `${(data.expense / 1000).toFixed(1)}k` : data.expense}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
