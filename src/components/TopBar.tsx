import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, Eye, EyeOff } from 'lucide-react';
import { formatINR, useUIStore } from '../hooks';
import { motion, AnimatePresence } from 'framer-motion';

interface TopBarProps {
  title: string;
  onPrev?: () => void;
  onNext?: () => void;
  stats?: { label: string; value: number; color: string; onClick?: () => void }[];
  showSearch?: boolean;
  onSearch?: () => void;
  showFilter?: boolean;
  onFilter?: () => void;
  isScrolled?: boolean;
}

export default function TopBar({
  title, onPrev, onNext, stats, showSearch, onSearch, showFilter, onFilter, isScrolled
}: TopBarProps) {
  const { hideAmounts, setHideAmounts } = useUIStore();

  return (
    <div className="bg-bg/85 backdrop-blur-xl pt-[env(safe-area-inset-top)] shrink-0 z-10 sticky top-0">
      {/* Title row */}
      <div className="flex items-center justify-between px-4 h-14">
        <div className="w-12 flex items-center">
          {onPrev ? (
            <motion.button 
              whileTap={{ scale: 0.8, x: -4 }}
              onClick={onPrev} 
              className="p-1 -ml-2 active:opacity-60 transition-opacity text-text-primary"
            >
              <ChevronLeft size={28} />
            </motion.button>
          ) : showSearch ? (
            <motion.button whileTap={{ scale: 0.85 }} onClick={onSearch} className="p-1 active:opacity-60 transition-opacity">
              <Search size={22} className="text-text-secondary" />
            </motion.button>
          ) : null}
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div 
            key={title}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex-1 flex items-center justify-center text-[17px] font-bold tracking-tight select-none truncate px-2 gap-2"
          >
            {title}
            {stats && stats.length > 0 && (
              <button onClick={() => setHideAmounts(!hideAmounts)} className="p-1 text-text-secondary hover:text-text-primary transition-colors active:opacity-60">
                {hideAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </motion.div>
        </AnimatePresence>
        
        <div className="w-12 flex justify-end items-center">
          {onNext ? (
            <motion.button 
              whileTap={{ scale: 0.8, x: 4 }}
              onClick={onNext} 
              className="p-1 -mr-2 active:opacity-60 transition-opacity text-text-primary"
            >
              <ChevronRight size={28} />
            </motion.button>
          ) : showFilter ? (
            <motion.button whileTap={{ scale: 0.85 }} onClick={onFilter} className="p-1 active:opacity-60 transition-opacity">
              <SlidersHorizontal size={22} className="text-text-secondary" />
            </motion.button>
          ) : null}
        </div>
      </div>

      {/* Stats row */}
      <AnimatePresence initial={false}>
        {stats && stats.length > 0 && !isScrolled && !hideAmounts && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex justify-between px-4 pb-3 pt-1 gap-2 overflow-hidden"
          >
            {stats.map((item) => (
              <div
                key={item.label}
                onClick={item.onClick}
                className={`flex-1 flex flex-col items-center justify-center bg-surface/50 backdrop-blur-md rounded-2xl py-3 border border-border/50 shadow-sm transition-shadow ${item.onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
              >
                <span className="text-text-tertiary text-[10px] font-bold uppercase tracking-wider mb-1">{item.label}</span>
                <span className={`${item.color} font-bold tracking-tight text-[15px]`}>
                  {formatINR(item.value)}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
