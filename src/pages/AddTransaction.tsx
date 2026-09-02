import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, X, Calendar, Tag, Wallet, FileText, AlignLeft, Repeat, ChevronRight, SplitSquareHorizontal, Wand2, Mic } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Drawer from '../components/Drawer';
import { db } from '../db';
import type { TransactionType, IAccount } from '../types';
import { useCategories, useAccountBalances, useAllTransactions, useSpeechRecognition } from '../hooks';
import { parseQuickAdd } from '../nlp';
import { playFeedback } from '../utils/feedback';

export default function AddTransaction() {
  const navigate = useNavigate();
  const categories = useCategories();
  const accounts = useAccountBalances();

  const allTx = useAllTransactions();

  const [quickAddText, setQuickAddText] = useState('');
  const [isSmartAddExpanded, setIsSmartAddExpanded] = useState(false);
  const { isListening, setIsListening } = useSpeechRecognition(setQuickAddText);
  
  const [currency] = useState('INR');
  const RATES: Record<string, number> = { INR: 1, USD: 83.5, EUR: 90.2, GBP: 105.4, AED: 22.7, JPY: 0.55 };

  const [isSplit, setIsSplit] = useState(false);
  const [friendShare, setFriendShare] = useState('');

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [note, setNote] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<string | undefined>(undefined);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [frequency, setFrequency] = useState<'daily'|'weekly'|'monthly'|'yearly'>('monthly');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showAccPicker, setShowAccPicker] = useState(false);
  const [showToAccPicker, setShowToAccPicker] = useState(false);

  const filteredCats = useMemo(() => {
    return categories.filter(c => c.type === type);
  }, [categories, type]);

  const selectedCatObj = categories.find(c => c.id === selectedCategory);
  const selectedAccObj = accounts.find(a => a.id === selectedAccount);
  const selectedToAccObj = accounts.find(a => a.id === toAccount);

  // NLP Quick Add Effect
  useEffect(() => {
    if (!quickAddText) return;
    const result = parseQuickAdd(quickAddText, allTx);
    if (result.amount) setAmount(result.amount.toString());
    if (result.type) setType(result.type);
    if (result.note) setNote(result.note);
    if (result.categoryId) setSelectedCategory(result.categoryId);
  }, [quickAddText, allTx]);

  const resetForm = () => {
    setAmount('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedCategory('');
    setNote('');
    setDescription('');
    setAttachment(undefined);
    setIsRecurring(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setAttachment(canvas.toDataURL('image/jpeg', 0.6)); // Compress to 60% quality jpeg
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (andContinue: boolean = false) => {
    const rawAmount = Number(amount);
    if (!rawAmount || rawAmount <= 0) return;

    const rate = RATES[currency] || 1;
    const finalAmount = rawAmount * rate;
    
    let myShare = finalAmount;
    let friendShareNum = 0;

    if (isSplit && type === 'expense') {
      const rawFriend = Number(friendShare);
      if (rawFriend > 0) {
        friendShareNum = rawFriend * rate;
        myShare = finalAmount - friendShareNum;
      }
    }

    const finalDescription = currency !== 'INR' 
      ? `${description ? description + ' ' : ''}(${currency} ${amount})`.trim()
      : description;

    let recurringId: string | undefined = undefined;

    if (isRecurring) {
      recurringId = uuidv4();
      
      const nextRun = new Date(date);
      if (frequency === 'daily') nextRun.setDate(nextRun.getDate() + 1);
      else if (frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
      else if (frequency === 'monthly') nextRun.setMonth(nextRun.getMonth() + 1);
      else if (frequency === 'yearly') nextRun.setFullYear(nextRun.getFullYear() + 1);

      await db.recurring_transactions.add({
        id: recurringId,
        type,
        amount: type === 'expense' ? myShare : finalAmount,
        categoryId: type === 'transfer' ? '' : selectedCategory,
        accountId: selectedAccount,
        toAccountId: type === 'transfer' ? toAccount : undefined,
        note,
        description: finalDescription,
        frequency,
        startDate: new Date(date).toISOString(),
        nextRunDate: nextRun.toISOString()
      });
    }

    if (type === 'transfer') {
      if (!selectedAccount || !toAccount) return;
      await db.transactions.add({
        id: uuidv4(),
        type: 'transfer',
        amount: finalAmount,
        date: new Date(date).toISOString(),
        category: '',
        accountId: selectedAccount,
        toAccountId: toAccount,
        note,
        description: finalDescription,
        attachment,
        recurringId,
      });
    } else {
      if (!selectedCategory || !selectedAccount) return;
      await db.transactions.add({
        id: uuidv4(),
        type,
        amount: type === 'expense' ? myShare : finalAmount,
        date: new Date(date).toISOString(),
        category: selectedCategory,
        accountId: selectedAccount,
        note,
        description: finalDescription,
        attachment,
        recurringId,
      });

      // Splitting logic: record the debt
      if (isSplit && friendShareNum > 0 && type === 'expense') {
        let recAcc = (accounts as any[]).find(a => a.name === 'Money Owed');
        if (!recAcc) {
          const newAcc: IAccount = { 
            id: uuidv4(), 
            name: 'Money Owed', 
            group: 'Others',
            balance: 0,
            settlementDate: 1,
            paymentDate: 1
          };
          await db.accounts.add(newAcc);
          recAcc = newAcc;
        }
        await db.transactions.add({
          id: uuidv4(),
          type: 'transfer',
          amount: friendShareNum,
          date: new Date(date).toISOString(),
          category: '',
          accountId: selectedAccount,
          toAccountId: recAcc.id,
          note: `Split: ${note}`,
          description: `Friend's share for ${finalDescription}`,
        });
      }
    }

    playFeedback.success();

    if (andContinue) {
      resetForm();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-bg w-full min-h-0">
      {/* Header */}
      <div className="pt-[env(safe-area-inset-top)] shrink-0">
        <div className="flex items-center justify-between px-4 h-14 relative">
          <AnimatePresence mode="wait">
            {!isSmartAddExpanded ? (
              <motion.div 
                key="title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between w-full"
              >
                <button onClick={() => navigate(-1)} className="p-1">
                  <ChevronLeft size={28} />
                </button>
                <span className="text-lg font-semibold capitalize">Add {type}</span>
                <button onClick={() => setIsSmartAddExpanded(true)} className="p-1">
                  <Wand2 size={22} className="text-coral" />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="input"
                initial={{ opacity: 0, width: '40px' }}
                animate={{ opacity: 1, width: 'calc(100% - 2rem)' }}
                exit={{ opacity: 0, width: '40px' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute right-4 flex items-center bg-surface border border-coral rounded-full pl-4 pr-2 py-1.5 shadow-[0_0_20px_rgba(255,255,255,0.05)] h-10 top-2"
              >
                <Wand2 size={18} className="text-coral mr-3 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. 'Spent 500 on coffee'"
                  value={quickAddText}
                  onChange={e => setQuickAddText(e.target.value)}
                  className="flex-1 bg-transparent text-[15px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
                  autoFocus
                />
                {quickAddText ? (
                  <button onClick={() => setQuickAddText('')} className="p-1.5 text-text-tertiary hover:text-text-primary transition-colors">
                    <X size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsListening(!isListening)}
                    className={`p-1.5 rounded-full transition-all duration-300 ${isListening ? 'bg-coral text-bg shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-pulse' : 'text-text-secondary hover:text-coral hover:bg-elevated'}`}
                  >
                    <Mic size={18} />
                  </button>
                )}
                <button onClick={() => setIsSmartAddExpanded(false)} className="p-1.5 text-text-tertiary hover:text-text-primary ml-1 border-l border-border pl-2">
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Type Segmented Control */}
      <div className="flex mx-4 mt-2 bg-elevated/50 backdrop-blur-md rounded-2xl p-1.5 border border-border/30 relative">
        {(['income', 'expense', 'transfer'] as TransactionType[]).map(t => {
          const isActive = type === t;
          const color = t === 'income' ? 'text-income' : t === 'expense' ? 'text-expense' : 'text-text-primary';
          return (
            <button
              key={t}
              onClick={() => { setType(t); setSelectedCategory(''); }}
              className={`flex-1 relative py-2.5 text-sm font-semibold capitalize rounded-xl
                ${isActive ? color : 'text-text-secondary hover:text-text-primary transition-colors'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-surface shadow-sm ring-1 ring-border/50 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{t}</span>
            </button>
          );
        })}
      </div>

      {/* Amount Hero Section */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="flex justify-center py-6 sm:py-10 mt-2"
      >
        <div className="flex-1 flex flex-col items-center">
          <div className="flex items-center justify-center w-full px-4 sm:px-8">
            <span className="text-3xl sm:text-4xl font-medium text-text-tertiary mr-1 pb-1">₹</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9.]/g, '');
                if (val.split('.').length > 2) return;
                setAmount(val);
              }}
              placeholder="0"
              className="bg-transparent text-5xl sm:text-6xl font-bold text-text-primary outline-none text-center placeholder:text-text-tertiary/20 tracking-tight max-w-full"
              style={{ width: `${Math.max(1, amount.length)}ch` }}
              autoFocus
            />
          </div>
        </div>
      </motion.div>

      {/* FORM CARD (Sleek List) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", damping: 25, stiffness: 200 }}
        className="flex-1 min-h-0 px-4 pb-28 overflow-y-auto"
      >
        <div className="bg-surface/50 backdrop-blur-xl border border-border/30 rounded-3xl overflow-hidden flex flex-col">
          
          {/* Date Row */}
          <div className="flex items-center py-3.5 px-4 border-b border-border/30 group relative">
            <div className="w-9 h-9 rounded-xl bg-elevated flex items-center justify-center text-text-primary mr-4 shrink-0 shadow-sm border border-border/50">
              <Calendar size={18} />
            </div>
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="text-[15px] font-medium text-text-primary">Date</span>
              <span className="text-[15px] font-medium text-text-secondary">
                {format(new Date(date), 'dd/MM/yyyy')}
              </span>
            </div>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            />
          </div>
          
          {/* Category Row */}
          {type !== 'transfer' && (
            <button onClick={() => setShowCatPicker(true)} className="w-full flex items-center py-3.5 px-4 border-b border-border/30 text-left active:bg-elevated transition-colors">
              <div className="w-9 h-9 rounded-xl bg-elevated flex items-center justify-center text-text-primary mr-4 shrink-0 shadow-sm border border-border/50">
                <Tag size={18} />
              </div>
              <div className="flex-1 flex items-center justify-between min-w-0 pr-2">
                <span className="text-[15px] font-medium text-text-primary">Category</span>
                {selectedCatObj ? (
                  <span className="text-[15px] font-medium text-text-secondary flex items-center gap-1.5">
                    <span>{selectedCatObj.icon}</span> {selectedCatObj.name}
                  </span>
                ) : (
                  <span className="text-[15px] font-medium text-text-tertiary">Select</span>
                )}
              </div>
              <ChevronRight size={18} className="text-text-tertiary shrink-0" />
            </button>
          )}

          {/* Account Row */}
          <button onClick={() => setShowAccPicker(true)} className="w-full flex items-center py-3.5 px-4 border-b border-border/30 text-left active:bg-elevated transition-colors">
            <div className="w-9 h-9 rounded-xl bg-elevated flex items-center justify-center text-text-primary mr-4 shrink-0 shadow-sm border border-border/50">
              <Wallet size={18} />
            </div>
            <div className="flex-1 flex items-center justify-between min-w-0 pr-2">
              <span className="text-[15px] font-medium text-text-primary">{type === 'transfer' ? 'From' : 'Account'}</span>
              <span className="text-[15px] font-medium text-text-secondary truncate ml-4">{selectedAccObj ? selectedAccObj.name : 'Select'}</span>
            </div>
            <ChevronRight size={18} className="text-text-tertiary shrink-0" />
          </button>

          {/* To Account (transfer only) */}
          {type === 'transfer' && (
            <button onClick={() => setShowToAccPicker(true)} className="w-full flex items-center py-3.5 px-4 border-b border-border/30 text-left active:bg-elevated transition-colors">
              <div className="w-9 h-9 rounded-xl bg-elevated flex items-center justify-center text-text-primary mr-4 shrink-0 shadow-sm border border-border/50">
                <Wallet size={18} />
              </div>
              <div className="flex-1 flex items-center justify-between min-w-0 pr-2">
                <span className="text-[15px] font-medium text-text-primary">To</span>
                <span className="text-[15px] font-medium text-text-secondary truncate ml-4">{selectedToAccObj ? selectedToAccObj.name : 'Select'}</span>
              </div>
              <ChevronRight size={18} className="text-text-tertiary shrink-0" />
            </button>
          )}

          <AnimatePresence initial={false}>
            {showMoreDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden flex flex-col"
              >
                {/* Note Row */}
                <div className="flex items-center py-3.5 px-4 border-b border-border/30">
                  <div className="w-9 h-9 rounded-xl bg-elevated flex items-center justify-center text-text-primary mr-4 shrink-0 shadow-sm border border-border/50">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 flex items-center min-w-0">
                    <input
                      type="text"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Note"
                      className="w-full bg-transparent text-[15px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
                    />
                  </div>
                  <label className="cursor-pointer shrink-0 ml-2 p-1">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <Camera size={18} className="text-text-tertiary hover:text-text-primary transition-colors" />
                  </label>
                </div>

                {/* Description Row */}
                <div className="flex items-center py-3.5 px-4 border-b border-border/30">
                  <div className="w-9 h-9 rounded-xl bg-elevated flex items-center justify-center text-text-primary mr-4 shrink-0 shadow-sm border border-border/50">
                    <AlignLeft size={18} />
                  </div>
                  <div className="flex-1 flex items-center min-w-0">
                    <input
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Description"
                      className="w-full bg-transparent text-[15px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
                    />
                  </div>
                </div>

                {/* Split Expense Row */}
                {type === 'expense' && (
                  <div className="flex items-center py-3.5 px-4 border-b border-border/30">
                    <div className="w-9 h-9 rounded-xl bg-elevated flex items-center justify-center text-text-primary mr-4 shrink-0 shadow-sm border border-border/50">
                      <SplitSquareHorizontal size={18} />
                    </div>
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="text-[15px] font-medium text-text-primary">Split</span>
                      <div className="flex items-center gap-3">
                        {isSplit && (
                          <div className="flex items-center bg-elevated border border-border/50 rounded-lg px-2 py-1 h-8">
                            <span className="text-text-tertiary text-sm mr-1">₹</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={friendShare}
                              onChange={e => {
                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                setFriendShare(val);
                              }}
                              placeholder="0"
                              className="w-12 bg-transparent text-sm font-medium outline-none text-text-primary text-right"
                            />
                          </div>
                        )}
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" checked={isSplit} onChange={e => setIsSplit(e.target.checked)} />
                          <div className="w-11 h-6 bg-border/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-transparent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300/50 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral peer-checked:after:bg-bg shadow-inner"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recurring Row */}
                <div className="flex items-center py-3.5 px-4">
                  <div className="w-9 h-9 rounded-xl bg-elevated flex items-center justify-center text-text-primary mr-4 shrink-0 shadow-sm border border-border/50">
                    <Repeat size={18} />
                  </div>
                  <div className="flex-1 flex items-center justify-between min-w-0">
                    <span className="text-[15px] font-medium text-text-primary">Recurring</span>
                    <div className="flex items-center gap-3">
                      {isRecurring && (
                        <select
                          value={frequency}
                          onChange={e => setFrequency(e.target.value as any)}
                          className="bg-transparent text-[15px] font-medium text-text-secondary outline-none border-none text-right appearance-none"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      )}
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                        <div className="w-11 h-6 bg-border/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-transparent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300/50 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-coral peer-checked:after:bg-bg shadow-inner"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowMoreDetails(!showMoreDetails)}
            className="py-3.5 w-full text-center text-sm font-semibold text-text-tertiary hover:text-text-primary transition-colors border-t border-border/30 bg-elevated/30 flex items-center justify-center gap-1"
          >
            {showMoreDetails ? "Hide Options" : "More Options..."}
          </button>
        </div>
        
        {/* Attachment Preview */}
        {attachment && (
          <div className="relative mt-4 rounded-3xl overflow-hidden border border-border/30 shadow-sm">
            <img src={attachment} alt="Receipt preview" className="w-full h-40 object-cover" />
            <button 
              onClick={() => setAttachment(undefined)} 
              className="absolute top-3 right-3 bg-bg/50 backdrop-blur-md rounded-full p-2 border border-white/10 text-white hover:bg-bg/70 transition-colors"
            >
              <X size={16} /> 
            </button>
          </div>
        )}
        
        {/* Spacer to prevent overlap with floating button */}
        <div className="h-32 shrink-0 w-full" />
      </motion.div>

      {/* Floating Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] bg-gradient-to-t from-bg via-bg/80 to-transparent pointer-events-none z-20">
        <div className="max-w-[440px] mx-auto pointer-events-auto">
          <button
            onClick={() => {
              const isValid = amount.length > 0 && parseFloat(amount) > 0 && selectedAccount && (type === 'transfer' ? toAccount : selectedCategory);
              if (isValid) handleSave(false);
            }}
            disabled={!(amount.length > 0 && parseFloat(amount) > 0 && selectedAccount && (type === 'transfer' ? toAccount : selectedCategory))}
            className={`w-full py-4 rounded-2xl font-semibold transition-all active:scale-[0.98] shadow-lg backdrop-blur-xl ${
              (amount.length > 0 && parseFloat(amount) > 0 && selectedAccount && (type === 'transfer' ? toAccount : selectedCategory))
                ? 'bg-coral text-bg shadow-coral/20'
                : 'bg-surface/80 border border-border/50 text-text-tertiary opacity-50'
            }`}
          >
            Save Transaction
          </button>
        </div>
      </div>

      {/* Category Picker Drawer */}
      <Drawer open={showCatPicker} onClose={() => setShowCatPicker(false)} title="Select Category">
        <div className="grid grid-cols-4 gap-2 p-4">
          {filteredCats.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setShowCatPicker(false); }}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all active:scale-95
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
                className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all active:scale-[0.98]
                  ${selectedAccount === acc.id ? 'bg-coral/20 ring-1 ring-coral' : 'bg-elevated'}`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{acc.name}</span>
                  <span className="text-xs text-text-tertiary">{acc.group}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-bold text-text-primary">
                    ₹{acc.computedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
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
                className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all active:scale-[0.98]
                  ${toAccount === acc.id ? 'bg-coral/20 ring-1 ring-coral' : 'bg-elevated'}`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{acc.name}</span>
                  <span className="text-xs text-text-tertiary">{acc.group}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-bold text-text-primary">
                    ₹{acc.computedBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </Drawer>
    </div>
  );
}
