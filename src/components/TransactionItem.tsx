import type { ITransaction, ICategory, IAccount } from '../types';
import { formatINR, getCategoryById, getAccountById } from '../hooks';

interface Props {
  transaction: ITransaction;
  categories: ICategory[];
  accounts: IAccount[];
  onClick?: () => void;
}

export default function TransactionItem({ transaction: tx, categories, accounts, onClick }: Props) {
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
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-full bg-elevated flex items-center justify-center text-lg shrink-0">
          {isTransfer ? '🔄' : cat?.icon ?? '📝'}
        </div>

        {/* Info */}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[15px] font-medium truncate max-w-[180px]">
            {isTransfer ? 'Transfer' : cat?.name ?? 'Unknown'}
          </span>
          <span className="text-xs text-text-secondary truncate max-w-[180px]">
            {isTransfer ? `${acc?.name ?? '?'} → ${toAcc?.name ?? '?'}` : acc?.name ?? ''}
            {tx.note ? ` · ${tx.note}` : ''}
          </span>
        </div>
      </div>

      {/* Amount */}
      <span className={`${amountColor} font-semibold text-[15px] shrink-0 ml-2`}>
        {prefix}{formatINR(tx.amount)}
      </span>
    </button>
  );
}
