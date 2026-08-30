import type { ITransaction, ICategory, IAccount } from '../types';
import { formatINR, getCategoryById, getAccountById } from '../hooks';
import { Paperclip } from 'lucide-react';

interface Props {
  transaction: ITransaction;
  categories: ICategory[];
  accounts: IAccount[];
  runningBalance?: number;
  onClick?: () => void;
}

export default function TransactionItem({ transaction: tx, categories, accounts, runningBalance, onClick }: Props) {
  const isTransfer = tx.type === 'transfer';
  const cat = !isTransfer ? getCategoryById(categories, tx.category) : undefined;
  const acc = getAccountById(accounts, tx.accountId);
  const toAcc = tx.toAccountId ? getAccountById(accounts, tx.toAccountId) : undefined;

  const amountColor =
    tx.type === 'income' ? 'text-income' :
    tx.type === 'expense' ? 'text-expense' : 'text-text-primary';

  const prefix = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-3 border-b border-border/50 active:bg-elevated/50 transition-colors"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Icon */}
        <div className="w-9 h-9 rounded-full bg-elevated flex items-center justify-center text-lg shrink-0">
          {isTransfer ? '🔄' : cat?.icon ?? '📝'}
        </div>

        {/* Info */}
        <div className="flex flex-col items-start min-w-0 flex-1 pr-2">
          <span className="text-[15px] font-medium truncate w-full text-left">
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
        <span className={`${amountColor} font-semibold text-[15px]`}>
          {prefix}{formatINR(tx.amount)}
        </span>
        {runningBalance !== undefined && (
          <span className="text-[10px] text-text-tertiary mt-0.5">
            {formatINR(runningBalance)}
          </span>
        )}
      </div>
    </button>
  );
}
