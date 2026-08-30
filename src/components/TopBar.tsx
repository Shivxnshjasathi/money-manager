import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import { formatINR } from '../hooks';

interface TopBarProps {
  title: string;
  onPrev?: () => void;
  onNext?: () => void;
  income: number;
  expense: number;
  showSearch?: boolean;
  onSearch?: () => void;
  showFilter?: boolean;
  onFilter?: () => void;
}

export default function TopBar({
  title, onPrev, onNext, income, expense, showSearch, onSearch, showFilter, onFilter,
}: TopBarProps) {
  const total = income - expense;

  return (
    <div className="bg-bg/85 backdrop-blur-xl pt-[env(safe-area-inset-top)] shrink-0 z-10 sticky top-0">
      {/* Title row */}
      <div className="flex items-center justify-between px-4 h-12">
        <div className="w-10 flex items-center">
          {showSearch && (
            <button onClick={onSearch} className="p-1 active:opacity-60 transition-opacity">
              <Search size={22} className="text-text-secondary" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-lg font-semibold select-none">
          {onPrev && (
            <button onClick={onPrev} className="p-1 active:opacity-60 transition-opacity">
              <ChevronLeft size={20} />
            </button>
          )}
          <span>{title}</span>
          {onNext && (
            <button onClick={onNext} className="p-1 active:opacity-60 transition-opacity">
              <ChevronRight size={20} />
            </button>
          )}
        </div>
        <div className="w-10 flex justify-end">
          {showFilter && (
            <button onClick={onFilter} className="p-1 active:opacity-60 transition-opacity">
              <SlidersHorizontal size={22} className="text-text-secondary" />
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex justify-between px-6 py-2.5 border-b border-border text-sm">
        <div className="flex flex-col items-center">
          <span className="text-text-tertiary text-xs">Income</span>
          <span className="text-income font-semibold">{formatINR(income)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-text-tertiary text-xs">Exp.</span>
          <span className="text-expense font-semibold">{formatINR(expense)}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-text-tertiary text-xs">Total</span>
          <span className={`font-semibold ${total >= 0 ? 'text-income' : 'text-expense'}`}>{formatINR(total)}</span>
        </div>
      </div>
    </div>
  );
}
