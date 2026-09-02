import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, PartyPopper } from 'lucide-react';
import { formatINR } from '../hooks';
import { playFeedback } from '../utils/feedback';

const TARGET_AMOUNT = 3000;
const SKIP_AMOUNT = 300;
const STORAGE_KEY = 'guiltFreeJarBalance';

export default function GuiltFreeJar() {
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, balance.toString());
  }, [balance]);

  const progress = Math.min(balance / TARGET_AMOUNT, 1);
  const isFull = balance >= TARGET_AMOUNT;

  const handleAdd = () => {
    if (isFull) return;
    playFeedback.action();
    setIsAdding(true);
    setBalance(prev => Math.min(prev + SKIP_AMOUNT, TARGET_AMOUNT));
    setTimeout(() => setIsAdding(false), 500);
  };

  const handleReset = () => {
    playFeedback.delete();
    setBalance(0);
  };

  return (
    <div className="mx-4 my-6 bg-surface/50 border border-border rounded-3xl p-5 relative overflow-hidden shadow-sm">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
            <span>🗑️</span> F*** It Fund
          </h2>
          <p className="text-xs text-text-tertiary mt-1">Skip a stupid purchase, treat yourself later.</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-text-primary">
            {formatINR(balance)} <span className="text-sm font-medium text-text-tertiary">/ {formatINR(TARGET_AMOUNT)}</span>
          </div>
        </div>
      </div>

      {/* Jar Visualization */}
      <div className="relative h-32 w-full bg-bg/50 rounded-2xl border-2 border-border/50 overflow-hidden mb-4 shadow-inner">
        {/* Empty state lines / measurement marks */}
        <div className="absolute inset-0 flex flex-col justify-between py-4 px-2 opacity-10">
          <div className="border-b border-white w-full"></div>
          <div className="border-b border-white w-full"></div>
          <div className="border-b border-white w-full"></div>
        </div>

        {/* Liquid */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-coral to-coral/80"
          initial={{ height: 0 }}
          animate={{ height: `${progress * 100}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        >
          {/* Waves */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-white/20 rounded-t-full -mt-2 blur-[2px]"></div>
        </motion.div>

        {/* Full Celebration Overlay */}
        <AnimatePresence>
          {isFull && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-coral/90 backdrop-blur-sm z-20"
            >
              <PartyPopper size={32} className="text-bg mb-2 animate-bounce" />
              <div className="font-bold text-bg text-xl tracking-tight">TREAT YOURSELF!</div>
              <div className="text-bg/80 text-xs font-medium uppercase tracking-widest mt-1">Zero Guilt Mode</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex gap-3 relative z-10">
        {!isFull ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-2 bg-coral text-bg py-3 px-4 rounded-xl font-bold tracking-wide shadow-md shadow-coral/20"
          >
            <Plus size={18} />
            Add {formatINR(SKIP_AMOUNT)}
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="flex-1 flex items-center justify-center gap-2 bg-bg text-text-primary border border-border py-3 px-4 rounded-xl font-bold tracking-wide hover:bg-surface transition-colors"
          >
            <Trash2 size={18} className="text-coral" />
            Empty Jar
          </motion.button>
        )}
      </div>

      {/* Adding micro-animation particles */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.5 }}
            animate={{ opacity: 0, y: -50, scale: 1.5 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl z-30 pointer-events-none"
          >
            +₹300
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
