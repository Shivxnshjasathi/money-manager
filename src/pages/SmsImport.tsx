import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquareText, Clipboard, Sparkles, Check, X, ChevronDown, ChevronUp, Plus, Trash2, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseBankSMS, parseBulkSMS, type ParsedSMS } from '../utils/smsParser';
import { db } from '../db';
import { useCategories, useAccounts, formatINR } from '../hooks';
import { v4 as uuidv4 } from 'uuid';
import { haptic } from '../utils/feedback';

interface ParsedTransaction {
  id: string;
  parsed: ParsedSMS;
  selected: boolean;
  categoryId: string;
  accountId: string;
}

export default function SmsImport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categories = useCategories();
  const accounts = useAccounts();
  const [smsText, setSmsText] = useState('');
  const [parsedTxs, setParsedTxs] = useState<ParsedTransaction[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Handle Web Share Target: read shared text from URL params
  useEffect(() => {
    const sharedText = searchParams.get('text') || searchParams.get('title') || '';
    if (sharedText) {
      setSmsText(sharedText);
      // Auto-parse shared text
      handleParse(sharedText);
    }
  }, [searchParams]);

  const handleParse = (text?: string) => {
    const input = text ?? smsText;
    if (!input.trim()) return;

    const results = parseBulkSMS(input);
    if (results.length === 0) {
      // Try single SMS
      const single = parseBankSMS(input);
      if (single.isValid) {
        results.push(single);
      }
    }

    if (results.length === 0) return;

    const txs: ParsedTransaction[] = results.map(parsed => {
      // Try to match account by hint
      let matchedAccountId = '';
      if (parsed.accountHint) {
        const hint = parsed.accountHint.toLowerCase();
        const match = accounts.find(a =>
          a.name.toLowerCase().includes(hint) ||
          hint.includes(a.name.toLowerCase())
        );
        if (match) matchedAccountId = match.id;
      }

      // Try to match category by note
      let matchedCategoryId = '';
      const catType = parsed.type === 'income' ? 'income' : 'expense';
      const typedCats = categories.filter(c => c.type === catType);
      if (parsed.note && typedCats.length > 0) {
        // Simple keyword matching
        const noteLower = parsed.note.toLowerCase();
        const catKeywords: Record<string, string[]> = {
          'Food': ['food', 'restaurant', 'swiggy', 'zomato', 'cafe', 'hotel', 'dominos', 'pizza', 'mcdonalds', 'burger', 'kfc', 'dining', 'eat'],
          'Transport': ['uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'irctc', 'fuel', 'petrol', 'diesel', 'parking', 'cab', 'taxi'],
          'Groceries': ['grocery', 'bigbasket', 'blinkit', 'zepto', 'instamart', 'dmart', 'supermarket', 'more', 'reliance fresh'],
          'Health': ['hospital', 'medical', 'pharmacy', 'doctor', 'apollo', 'medplus', 'pharmeasy', '1mg', 'clinic', 'health'],
          'Education': ['school', 'college', 'tuition', 'course', 'udemy', 'fees', 'book', 'education'],
          'Apparel': ['amazon', 'flipkart', 'myntra', 'ajio', 'shopping', 'mall', 'clothing', 'fashion'],
          'Household': ['electricity', 'water', 'gas', 'rent', 'maintenance', 'bill', 'broadband', 'wifi', 'recharge', 'airtel', 'jio', 'vi'],
          'Social Life': ['movie', 'pvr', 'inox', 'party', 'club', 'bar', 'pub', 'outing'],
          'Beauty': ['salon', 'spa', 'parlour', 'beauty', 'grooming'],
          'Gift': ['gift', 'donation', 'charity'],
          'Salary': ['salary', 'payroll', 'stipend', 'wages'],
          'Bonus': ['bonus', 'incentive', 'reward'],
        };

        for (const [catName, keywords] of Object.entries(catKeywords)) {
          if (keywords.some(kw => noteLower.includes(kw))) {
            const match = typedCats.find(c => c.name.toLowerCase() === catName.toLowerCase());
            if (match) {
              matchedCategoryId = match.id;
              break;
            }
          }
        }

        // If no match, default to "Other"
        if (!matchedCategoryId) {
          const other = typedCats.find(c => c.name === 'Other');
          if (other) matchedCategoryId = other.id;
        }
      }

      return {
        id: uuidv4(),
        parsed,
        selected: true,
        categoryId: matchedCategoryId,
        accountId: matchedAccountId,
      };
    });

    setParsedTxs(txs);
    haptic.success();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSmsText(text);
        handleParse(text);
      }
    } catch {
      // Clipboard API not available, just focus the textarea
    }
  };

  const toggleSelect = (id: string) => {
    setParsedTxs(prev =>
      prev.map(tx => tx.id === id ? { ...tx, selected: !tx.selected } : tx)
    );
  };

  const selectedCount = parsedTxs.filter(tx => tx.selected).length;

  const handleImport = async () => {
    const toImport = parsedTxs.filter(tx => tx.selected);
    if (toImport.length === 0) return;

    setImporting(true);
    haptic.light();

    try {
      const newTxs = toImport.map((tx, idx) => ({
        id: uuidv4(),
        type: tx.parsed.type,
        amount: tx.parsed.amount,
        date: tx.parsed.date || new Date().toISOString(),
        category: tx.categoryId,
        accountId: tx.accountId,
        note: tx.parsed.note,
        description: tx.parsed.description,
        createdAt: Date.now() + idx,
      }));

      await db.transactions.bulkAdd(newTxs);
      setImportCount(newTxs.length);
      setImported(true);
      haptic.success();
    } catch (err) {
      console.error('Failed to import SMS transactions:', err);
      alert('Failed to import. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleRemove = (id: string) => {
    setParsedTxs(prev => prev.filter(tx => tx.id !== id));
    haptic.light();
  };

  // ── Success Screen ─────────────────────────────────
  if (imported) {
    return (
      <div className="flex flex-col h-full w-full bg-bg">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-20 h-20 rounded-full bg-income/10 flex items-center justify-center mb-6"
          >
            <Check size={40} className="text-income" />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold tracking-tight mb-2"
          >
            {importCount} Transaction{importCount !== 1 ? 's' : ''} Added!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-text-secondary text-center text-sm mb-8"
          >
            Transactions from your SMS have been imported successfully.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex gap-3 w-full max-w-xs"
          >
            <button
              onClick={() => {
                setSmsText('');
                setParsedTxs([]);
                setImported(false);
              }}
              className="flex-1 py-3.5 rounded-2xl font-semibold bg-surface text-text-primary border border-border active:scale-[0.97] transition-transform"
            >
              Import More
            </button>
            <button
              onClick={() => navigate('/transactions')}
              className="flex-1 py-3.5 rounded-2xl font-semibold bg-coral text-bg active:scale-[0.97] transition-transform"
            >
              View All
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full bg-bg">
      {/* Header */}
      <div className="bg-bg/85 backdrop-blur-xl pt-[env(safe-area-inset-top)] shrink-0 z-10 border-b border-border/50">
        <div className="flex items-center px-4 h-14 gap-3">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => navigate(-1)}
            className="p-1 -ml-1 text-text-primary"
          >
            <ArrowLeft size={24} />
          </motion.button>
          <h1 className="text-[17px] font-bold tracking-tight flex-1">SMS Import</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Info Banner */}
        <div className="mx-4 mt-4 p-4 bg-coral/5 border border-coral/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-coral/10 flex items-center justify-center shrink-0 mt-0.5">
              <Share2 size={18} className="text-coral" />
            </div>
            <div>
              <h3 className="font-bold text-sm mb-1">How it works</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                On Android, <strong>share SMS</strong> directly from your messaging app to this app.
                Or <strong>copy & paste</strong> bank SMS below to auto-detect transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4 mt-4">
          <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-2">
            Paste Bank SMS
          </label>
          <div className="relative">
            <textarea
              value={smsText}
              onChange={e => setSmsText(e.target.value)}
              placeholder={`Paste your bank SMS here...\n\nExample:\n"Rs.500.00 debited from A/c XX1234 on 03-09-26. UPI txn to Swiggy. Bal: Rs.12,345.00"`}
              className="w-full min-h-[140px] bg-surface border border-border rounded-2xl p-4 text-sm text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/40 transition-all"
              rows={5}
            />
            {smsText && (
              <button
                onClick={() => { setSmsText(''); setParsedTxs([]); }}
                className="absolute top-3 right-3 p-1.5 bg-elevated rounded-full hover:bg-border transition-colors"
              >
                <X size={14} className="text-text-secondary" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handlePaste}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-surface border border-border font-semibold text-sm active:scale-[0.97] transition-transform"
            >
              <Clipboard size={16} className="text-text-secondary" />
              <span>Paste</span>
            </button>
            <button
              onClick={() => handleParse()}
              disabled={!smsText.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-coral text-bg font-semibold text-sm active:scale-[0.97] transition-transform disabled:opacity-40 disabled:active:scale-100"
            >
              <Sparkles size={16} />
              <span>Parse SMS</span>
            </button>
          </div>
        </div>

        {/* Parsed Results */}
        <AnimatePresence>
          {parsedTxs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 mt-6 pb-32"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider ml-1">
                  Detected Transactions ({parsedTxs.length})
                </span>
                <span className="text-[11px] font-bold text-income tracking-wider">
                  {selectedCount} selected
                </span>
              </div>

              <div className="space-y-3">
                {parsedTxs.map((tx) => (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-surface rounded-2xl border overflow-hidden transition-colors ${
                      tx.selected ? 'border-coral/30' : 'border-border/50 opacity-60'
                    }`}
                  >
                    {/* Main Row */}
                    <div className="flex items-center gap-3 p-4">
                      {/* Select Toggle */}
                      <button
                        onClick={() => toggleSelect(tx.id)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                          tx.selected
                            ? 'bg-coral border-coral'
                            : 'border-border bg-transparent'
                        }`}
                      >
                        {tx.selected && <Check size={14} className="text-bg" />}
                      </button>

                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        tx.parsed.type === 'income' ? 'bg-income/10' : 'bg-expense/10'
                      }`}>
                        <MessageSquareText size={18} className={
                          tx.parsed.type === 'income' ? 'text-income' : 'text-expense'
                        } />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">
                          {tx.parsed.note || tx.parsed.accountHint || 'Bank Transaction'}
                        </div>
                        <div className="text-[11px] text-text-tertiary truncate mt-0.5">
                          {tx.parsed.accountHint && <span className="mr-2">{tx.parsed.accountHint}</span>}
                          <span className={`uppercase font-bold ${tx.parsed.type === 'income' ? 'text-income' : 'text-expense'}`}>
                            {tx.parsed.type}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <span className={`font-bold text-[15px] shrink-0 ${
                        tx.parsed.type === 'income' ? 'text-income' : 'text-expense'
                      }`}>
                        {tx.parsed.type === 'income' ? '+' : '-'}{formatINR(tx.parsed.amount)}
                      </span>

                      {/* Expand */}
                      <button
                        onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                        className="p-1 shrink-0"
                      >
                        {expandedId === tx.id
                          ? <ChevronUp size={16} className="text-text-tertiary" />
                          : <ChevronDown size={16} className="text-text-tertiary" />
                        }
                      </button>
                    </div>

                    {/* Expanded: Edit category & account */}
                    <AnimatePresence>
                      {expandedId === tx.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border/50">
                            {/* Category Select */}
                            <div>
                              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">Category</label>
                              <select
                                value={tx.categoryId}
                                onChange={e => {
                                  setParsedTxs(prev =>
                                    prev.map(t => t.id === tx.id ? { ...t, categoryId: e.target.value } : t)
                                  );
                                }}
                                className="w-full bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                              >
                                <option value="">Select Category</option>
                                {categories
                                  .filter(c => c.type === tx.parsed.type)
                                  .map(c => (
                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                  ))
                                }
                              </select>
                            </div>

                            {/* Account Select */}
                            <div>
                              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">Account</label>
                              <select
                                value={tx.accountId}
                                onChange={e => {
                                  setParsedTxs(prev =>
                                    prev.map(t => t.id === tx.id ? { ...t, accountId: e.target.value } : t)
                                  );
                                }}
                                className="w-full bg-elevated border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary"
                              >
                                <option value="">Select Account</option>
                                {accounts.map(a => (
                                  <option key={a.id} value={a.id}>{a.name}</option>
                                ))}
                              </select>
                            </div>

                            {/* Original SMS */}
                            <div>
                              <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider block mb-1">Original SMS</label>
                              <p className="text-xs text-text-secondary bg-elevated/50 rounded-xl p-3 leading-relaxed border border-border/50">
                                {tx.parsed.description}
                              </p>
                            </div>

                            {/* Remove */}
                            <button
                              onClick={() => handleRemove(tx.id)}
                              className="flex items-center gap-2 text-expense text-xs font-bold py-1"
                            >
                              <Trash2 size={14} />
                              Remove
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {parsedTxs.length === 0 && !smsText && (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4 border border-border/50">
              <MessageSquareText size={28} className="text-text-tertiary" />
            </div>
            <p className="text-text-secondary text-sm text-center leading-relaxed">
              Paste bank SMS messages above to automatically detect and import transactions.
            </p>
            <p className="text-text-tertiary text-xs text-center mt-2 leading-relaxed">
              Supports SBI, HDFC, ICICI, Axis, Kotak, and most Indian banks.
              Also supports UPI, Paytm, PhonePe, GPay notifications.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Import Button */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 p-4 bg-bg/95 backdrop-blur-xl border-t border-border z-[60] pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full py-4 rounded-2xl bg-coral text-bg font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-60"
            >
              {importing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <Sparkles size={18} />
                </motion.div>
              ) : (
                <Plus size={18} />
              )}
              {importing ? 'Importing...' : `Import ${selectedCount} Transaction${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
