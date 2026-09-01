import { useRef } from 'react';
import type { ITransaction, ICategory, IAccount } from '../types';
import { formatINR, getCategoryById, getAccountById } from '../hooks';
import { Paperclip } from 'lucide-react';

import { motion, type Variants } from 'framer-motion';

interface Props {
  transaction: ITransaction;
  categories: ICategory[];
  accounts: IAccount[];
  runningBalance?: number;
  onClick?: () => void;
  onLongPress?: () => void;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

export default function TransactionItem({ transaction: tx, categories, accounts, runningBalance, onClick, onLongPress }: Props) {
  const isTransfer = tx.type === 'transfer';
  const cat = !isTransfer ? getCategoryById(categories, tx.category) : undefined;
  const acc = getAccountById(accounts, tx.accountId);
  const toAcc = tx.toAccountId ? getAccountById(accounts, tx.toAccountId) : undefined;

  const amountColor =
    tx.type === 'income' ? 'text-income' :
    tx.type === 'expense' ? 'text-expense' : 'text-text-primary';

  const prefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
      onLongPress?.();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <motion.button
      variants={itemVariants}
      layout
      initial="hidden"
      animate="visible"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className="flex items-center justify-between w-full p-4 rounded-2xl border border-border shadow-sm transition-all bg-surface hover:bg-elevated hover:shadow-md"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Icon */}
        <div className="w-9 h-9 rounded-2xl bg-elevated flex items-center justify-center text-lg shrink-0 shadow-sm border border-border/50">
          {isTransfer ? '🔄' : cat?.icon ?? '📝'}
        </div>

        {/* Info */}
        <div className="flex flex-col items-start min-w-0 flex-1 pr-2">
          <span className="text-[15px] font-semibold truncate w-full text-left tracking-tight">
            {isTransfer ? 'Transfer' : cat?.name ?? 'Unknown'}
          </span>
          <div className="flex items-center text-xs text-text-secondary w-full">
            <span className="truncate">
              {isTransfer ? `${acc?.name ?? '?'} → ${toAcc?.name ?? '?'}` : acc?.name ?? ''}
              {tx.note ? ` · ${tx.note}` : ''}
            </span>
            {tx.attachment && <Paperclip size={10} className="shrink-0 ml-1" />}
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col items-end shrink-0 ml-2">
        <span className={`${amountColor} font-bold text-[15px] tracking-tight`}>
          {prefix}{formatINR(tx.amount)}
        </span>
        {runningBalance !== undefined && (
          <span className="text-[10px] text-text-tertiary mt-0.5 font-medium">
            {formatINR(runningBalance)}
          </span>
        )}
      </div>
    </motion.button>
  );
}
