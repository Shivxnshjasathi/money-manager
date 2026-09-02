import { useRef, useState, useEffect } from 'react';
import type { ITransaction, ICategory, IAccount } from '../types';
import { formatINR, getCategoryById, getAccountById } from '../hooks';
import { Paperclip, Trash2, CheckCircle2 } from 'lucide-react';
import { playFeedback } from '../utils/feedback';

import { motion, useAnimation, type Variants, type PanInfo } from 'framer-motion';

interface Props {
  transaction: ITransaction;
  categories: ICategory[];
  accounts: IAccount[];
  runningBalance?: number;
  onClick?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  onSettle?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  }
};

export default function TransactionItem({ transaction: tx, categories, accounts, runningBalance, onClick, onLongPress, onDelete, onSettle, selectionMode, isSelected }: Props) {
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
      playFeedback.action();
      onLongPress?.();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // Drag logic
  const controls = useAnimation();
  const [showDelete, setShowDelete] = useState(false);
  
  // ensure initial state
  useEffect(() => {
    controls.set({ x: 0 });
  }, [controls]);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    if (selectionMode) return;
    const threshold = -60;
    if (info.offset.x < threshold) {
      playFeedback.action();
      setShowDelete(true);
      controls.start({ x: -80, transition: { type: 'spring', stiffness: 400, damping: 25 } });
    } else {
      setShowDelete(false);
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 400, damping: 25 } });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playFeedback.delete();
    onDelete?.(); // Trigger parent delete action
  };

  return (
    <motion.div variants={itemVariants} className="relative w-full rounded-2xl mb-1.5 overflow-hidden group">
      {/* Background Delete Action */}
      <div 
        className="absolute inset-0 bg-elevated rounded-2xl border border-border/50 flex items-center justify-end pr-7 text-text-tertiary hover:text-coral cursor-pointer transition-colors"
        onClick={handleDeleteClick}
      >
        <Trash2 size={22} className={showDelete ? "animate-pulse text-coral" : ""} />
      </div>

      <motion.div
        layout
        animate={controls}
        drag="x"
        dragConstraints={{ left: showDelete ? -80 : 0, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={handleDragEnd}
        className="relative z-10 w-full"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={(e) => {
            if (showDelete) {
              e.preventDefault();
              setShowDelete(false);
              controls.start({ x: 0 });
              return;
            }
            playFeedback.tap();
            onClick?.();
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          className="flex items-center justify-between w-full p-4 rounded-2xl border border-border/50 shadow-sm transition-all bg-surface hover:bg-elevated"
        >
          {selectionMode && (
            <div className="shrink-0 mr-3">
              {isSelected ? (
                <CheckCircle2 size={24} className="text-primary fill-primary/20" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-border/50" />
              )}
            </div>
          )}
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
            {onSettle && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSettle();
                }}
                className="mt-1.5 bg-income/10 text-income text-[10px] px-2.5 py-1 rounded-md font-bold border border-income/20 active:scale-95 transition-transform"
              >
                Settle
              </button>
            )}
          </div>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
