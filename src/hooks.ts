import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { ICategory, IAccount } from './types';
import { useMemo, useState, useEffect } from 'react';
import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    return { theme: newTheme };
  }),
}));

interface UIState {
  isScrollingDown: boolean;
  setIsScrollingDown: (isDown: boolean) => void;
  hideAmounts: boolean;
  setHideAmounts: (hide: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isScrollingDown: false,
  setIsScrollingDown: (isDown) => set({ isScrollingDown: isDown }),
  hideAmounts: (localStorage.getItem('hideAmounts') === 'true'),
  setHideAmounts: (hide) => set(() => {
    localStorage.setItem('hideAmounts', String(hide));
    return { hideAmounts: hide };
  }),
}));

export function useGoals() {
  return useLiveQuery(() => db.goals.toArray(), []) ?? [];
}

export function useTransactions(monthDate?: Date) {
  const allTx = useLiveQuery(() => db.transactions.toArray(), []) ?? [];

  return useMemo(() => {
    if (!monthDate) return allTx;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    return allTx.filter(tx => {
      const d = new Date(tx.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [allTx, monthDate]);
}

export function useAllTransactions() {
  return useLiveQuery(() => db.transactions.toArray(), []) ?? [];
}

export function useAccounts() {
  return useLiveQuery(() => db.accounts.toArray(), []) ?? [];
}

export function useCategories() {
  return useLiveQuery(() => db.categories.toArray(), []) ?? [];
}

export function useBudgets(yearMonth: string) {
  return useLiveQuery(
    () => db.budgets.where('yearMonth').equals(yearMonth).toArray(),
    [yearMonth]
  ) ?? [];
}

/**
 * Computes real-time account balances from all transactions.
 * The account's `balance` field is treated as the initial/starting balance.
 * Every income adds, every expense subtracts, transfers move money between accounts.
 */
export function useAccountBalances() {
  const accounts = useAccounts();
  const allTransactions = useLiveQuery(() => db.transactions.toArray(), []) ?? [];

  return useMemo(() => {
    return accounts.map(account => {
      let balance = account.balance; // Start from initial balance

      allTransactions.forEach(tx => {
        if (tx.type === 'income' && tx.accountId === account.id) {
          balance += tx.amount;
        }
        if (tx.type === 'expense' && tx.accountId === account.id) {
          balance -= tx.amount;
        }
        if (tx.type === 'transfer') {
          if (tx.accountId === account.id) {
            balance -= tx.amount;
          }
          if (tx.toAccountId === account.id) {
            balance += tx.amount;
          }
        }
      });

      return { ...account, computedBalance: balance };
    });
  }, [accounts, allTransactions]);
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCategoryById(categories: ICategory[], id: string): ICategory | undefined {
  return categories.find(c => c.id === id);
}

export function getAccountById(accounts: IAccount[], id: string): IAccount | undefined {
  return accounts.find(a => a.id === id);
}

export function useSpeechRecognition(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    let recognition: any;
    if (isListening && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        onResult(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    }
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [isListening, onResult]);

  return { isListening, setIsListening };
}
