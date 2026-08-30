import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Camera } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import Drawer from '../components/Drawer';
import { db } from '../db';
import type { TransactionType } from '../types';
import { useCategories, useAccounts } from '../hooks';

export default function AddTransaction() {
  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccounts();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [fee, setFee] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showAccPicker, setShowAccPicker] = useState(false);
  const [showToAccPicker, setShowToAccPicker] = useState(false);

  const filteredCats = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  const selectedCatObj = categories.find(c => c.id === selectedCategory);
  const selectedAccObj = accounts.find(a => a.id === selectedAccount);
  const selectedToAccObj = accounts.find(a => a.id === toAccount);

  const activeColor = type === 'income' ? '#4E9FDF' : type === 'expense' ? '#E05353' : '#98989D';
  const activeColorClass = type === 'income' ? 'text-income' : type === 'expense' ? 'text-expense' : 'text-transfer';
  const activeBgClass = type === 'income' ? 'bg-income' : type === 'expense' ? 'bg-expense' : 'bg-transfer';

  const resetForm = () => {
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedCategory('');
    setNote('');
    setDescription('');
    setFee('');
  };

  const handleSave = async (andContinue: boolean = false) => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return;

    if (type === 'transfer') {
      if (!selectedAccount || !toAccount) return;
      await db.transactions.add({
        id: uuidv4(),
        type: 'transfer',
        amount: numAmount,
        date: new Date(date).toISOString(),
        category: '',
        accountId: selectedAccount,
        toAccountId: toAccount,
        note,
        description,
        isRecurring: false,
        fee: Number(fee) || 0,
      });
    } else {
      if (!selectedCategory || !selectedAccount) return;
      await db.transactions.add({
        id: uuidv4(),
        type,
        amount: numAmount,
        date: new Date(date).toISOString(),
        category: selectedCategory,
        accountId: selectedAccount,
        note,
        description,
        isRecurring: false,
        fee: 0,
      });
    }

    if (andContinue) {
      resetForm();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 pt-[env(safe-area-inset-top)] shrink-0">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={28} />
        </button>
        <span className="text-lg font-semibold capitalize">{type}</span>
        <button className="p-1">
          <Star size={22} className="text-text-secondary" />
        </button>
      </div>

      {/* Type Segmented Control */}
      <div className="flex mx-4 mb-4 bg-surface rounded-xl overflow-hidden border border-border">
        {(['income', 'expense', 'transfer'] as TransactionType[]).map(t => {
          const isActive = type === t;
          const color = t === 'income' ? 'text-income' : t === 'expense' ? 'text-expense' : 'text-transfer';
          return (
            <button
              key={t}
              onClick={() => { setType(t); setSelectedCategory(''); }}
              className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all duration-200
                ${isActive ? `${color} bg-elevated` : 'text-text-secondary'}`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 space-y-0">
        {/* Date */}
        <div className="flex items-center py-4 border-b border-border">
          <span className="text-text-secondary text-sm w-20 shrink-0">Date</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="flex-1 bg-transparent text-text-primary text-sm outline-none"
          />
        </div>

        {/* Amount */}
        <div className="flex items-center py-4 border-b border-border">
          <span className="text-text-secondary text-sm w-20 shrink-0">Amount</span>
          <div className="flex items-center flex-1 gap-2">
            <span className={`text-2xl font-bold ${activeColorClass}`}>₹</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-2xl font-bold outline-none placeholder:text-text-tertiary"
              style={{ borderBottom: `2px solid ${activeColor}` }}
              autoFocus
            />
          </div>
        </div>

        {/* Category (not for transfer) */}
        {type !== 'transfer' && (
          <button
            onClick={() => setShowCatPicker(true)}
            className="flex items-center py-4 border-b border-border w-full"
          >
            <span className="text-text-secondary text-sm w-20 shrink-0">Category</span>
            <div className="flex items-center gap-2 flex-1">
              {selectedCatObj ? (
                <>
                  <span className="text-lg">{selectedCatObj.icon}</span>
                  <span className="text-sm">{selectedCatObj.name}</span>
                </>
              ) : (
                <span className="text-text-tertiary text-sm">Select category</span>
              )}
            </div>
          </button>
        )}

        {/* Account / From Account */}
        <button
          onClick={() => setShowAccPicker(true)}
          className="flex items-center py-4 border-b border-border w-full"
        >
          <span className="text-text-secondary text-sm w-20 shrink-0">{type === 'transfer' ? 'From' : 'Account'}</span>
          <div className="flex items-center gap-2 flex-1">
            {selectedAccObj ? (
              <span className="text-sm">{selectedAccObj.name}</span>
            ) : (
              <span className="text-text-tertiary text-sm">Select account</span>
            )}
          </div>
        </button>

        {/* To Account (transfer only) */}
        {type === 'transfer' && (
          <button
            onClick={() => setShowToAccPicker(true)}
            className="flex items-center py-4 border-b border-border w-full"
          >
            <span className="text-text-secondary text-sm w-20 shrink-0">To</span>
            <div className="flex items-center gap-2 flex-1">
              {selectedToAccObj ? (
                <span className="text-sm">{selectedToAccObj.name}</span>
              ) : (
                <span className="text-text-tertiary text-sm">Select account</span>
              )}
            </div>
          </button>
        )}

        {/* Fee (transfer only) */}
        {type === 'transfer' && (
          <div className="flex items-center py-4 border-b border-border">
            <span className="text-text-secondary text-sm w-20 shrink-0">Fee</span>
            <input
              type="number"
              inputMode="decimal"
              value={fee}
              onChange={e => setFee(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
            />
          </div>
        )}

        {/* Note */}
        <div className="flex items-center py-4 border-b border-border">
          <span className="text-text-secondary text-sm w-20 shrink-0">Note</span>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add note"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
          />
          <Camera size={20} className="text-text-tertiary ml-2 shrink-0" />
        </div>

        {/* Description */}
        <div className="flex items-center py-4 border-b border-border">
          <span className="text-text-secondary text-sm w-20 shrink-0">Desc.</span>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 p-4 bg-elevated shrink-0 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <button
          onClick={() => handleSave(false)}
          className={`flex-[2] py-4 rounded-xl font-semibold text-white transition-all active:scale-[0.98] ${activeBgClass}`}
        >
          Save
        </button>
        <button
          onClick={() => handleSave(true)}
          className="flex-1 py-4 rounded-xl font-semibold border border-border text-text-primary transition-all active:scale-[0.98]"
        >
          Continue
        </button>
      </div>

      {/* Category Picker Drawer */}
      <Drawer open={showCatPicker} onClose={() => setShowCatPicker(false)} title="Select Category">
        <div className="grid grid-cols-4 gap-2 p-4">
          {filteredCats.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setShowCatPicker(false); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all active:scale-95
                ${selectedCategory === cat.id ? 'bg-coral/20 ring-1 ring-coral' : 'bg-elevated'}`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-[11px] text-text-secondary truncate w-full text-center">{cat.name}</span>
            </button>
          ))}
        </div>
      </Drawer>

      {/* Account Picker Drawer */}
      <Drawer open={showAccPicker} onClose={() => setShowAccPicker(false)} title="Select Account">
        <div className="p-4 space-y-2">
          {accounts.length === 0 ? (
            <div className="text-center text-text-secondary text-sm py-4">
              No accounts available. Please add one from the Accounts tab.
            </div>
          ) : (
            accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => { setSelectedAccount(acc.id); setShowAccPicker(false); }}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all active:scale-[0.98]
                  ${selectedAccount === acc.id ? 'bg-coral/20 ring-1 ring-coral' : 'bg-elevated'}`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{acc.name}</span>
                  <span className="text-xs text-text-tertiary">{acc.group}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </Drawer>

      {/* To-Account Picker Drawer */}
      <Drawer open={showToAccPicker} onClose={() => setShowToAccPicker(false)} title="Transfer To">
        <div className="p-4 space-y-2">
          {accounts.filter(a => a.id !== selectedAccount).length === 0 ? (
            <div className="text-center text-text-secondary text-sm py-4">
              No other accounts available for transfer.
            </div>
          ) : (
            accounts.filter(a => a.id !== selectedAccount).map(acc => (
              <button
                key={acc.id}
                onClick={() => { setToAccount(acc.id); setShowToAccPicker(false); }}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all active:scale-[0.98]
                  ${toAccount === acc.id ? 'bg-coral/20 ring-1 ring-coral' : 'bg-elevated'}`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{acc.name}</span>
                  <span className="text-xs text-text-tertiary">{acc.group}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </Drawer>
    </div>
  );
}
