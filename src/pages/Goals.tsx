import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Target, Check, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Drawer from '../components/Drawer';
import { db } from '../db';
import { useGoals, formatINR } from '../hooks';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
};

export default function Goals() {
  const navigate = useNavigate();
  const goals = useGoals();
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const COLORS = ['#FF5A5F', '#FF9F43', '#FECA57', '#48DBFB', '#0ABDE3', '#10AC84', '#EE5A24', '#A29BFE', '#FD79A8'];
  const [color, setColor] = useState(COLORS[0]);

  const isGoalValid = name.trim().length > 0 && parseFloat(targetAmount) > 0;

  const handleSaveGoal = async () => {
    const numTarget = Number(targetAmount);
    if (!name || !numTarget || numTarget <= 0) return;

    await db.goals.add({
      id: uuidv4(),
      name,
      targetAmount: numTarget,
      currentAmount: 0,
      color,
    });

    setShowAddDrawer(false);
    setName('');
    setTargetAmount('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this goal?')) {
      await db.goals.delete(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="pt-[env(safe-area-inset-top)] shrink-0 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-1">
            <ChevronLeft size={28} />
          </button>
          <span className="text-lg font-semibold">Savings Goals</span>
          <button className="p-1" onClick={() => setShowAddDrawer(true)}>
            <Plus size={22} className="text-coral" />
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div 
        variants={listVariants} 
        initial="hidden" 
        animate="visible"
        className="flex-1 overflow-y-auto px-4 space-y-4 pt-4"
      >
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-secondary text-sm gap-2">
            <Target size={40} className="text-border" />
            <span>No goals yet. Start saving!</span>
          </div>
        ) : (
          <AnimatePresence>
            {goals.map(goal => {
              const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
              
              return (
                <motion.div 
                  key={goal.id} 
                  variants={itemVariants}
                  layout
                  exit="exit"
                  className="relative overflow-hidden bg-surface/60 backdrop-blur-xl rounded-2xl p-6 border border-white/10 dark:border-white/5 shadow-xl shadow-black/5"
                >
                  {/* Subtle color glow behind the card */}
                  <div 
                    className="absolute -top-10 -right-10 w-32 h-32 rounded-2xl blur-3xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: goal.color || '#0ABDE3' }}
                  />

                  <div className="relative flex justify-between items-start mb-6">
                    <div>
                      <h3 className="font-semibold text-lg">{goal.name}</h3>
                      <p className="text-xs text-text-secondary mt-1">
                        {formatINR(goal.currentAmount)} of {formatINR(goal.targetAmount)}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(goal.id)}
                      className="p-2 text-text-tertiary hover:text-expense transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="relative h-2 bg-elevated rounded-2xl overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="absolute top-0 left-0 h-full rounded-2xl transition-all"
                      style={{ backgroundColor: goal.color || '#0ABDE3' }}
                    />
                  </div>
                  <div className="mt-2 text-right text-[10px] text-text-tertiary font-medium">
                    {progress.toFixed(1)}%
                  </div>

                  <button
                    onClick={() => {
                      const amt = prompt('How much to add?');
                      if (amt && !isNaN(Number(amt))) {
                        db.goals.update(goal.id, {
                          currentAmount: goal.currentAmount + Number(amt)
                        });
                        db.transactions.add({
                          id: uuidv4(),
                          amount: Number(amt),
                          type: 'expense',
                          date: new Date().toISOString(),
                          category: 'goal',
                          accountId: 'cash',
                          note: `Contribution to ${goal.name}`,
                          description: '',
                        });
                      }
                    }}
                    className="mt-4 w-full py-2 bg-elevated rounded-2xl text-sm font-medium active:scale-95 transition-all"
                  >
                    Add Funds
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Add Goal Drawer */}
      <Drawer open={showAddDrawer} onClose={() => setShowAddDrawer(false)} title="New Goal">
        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Goal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Vacation to Bali"
                className="input-premium"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Target Amount</label>
              <div className="input-premium-wrapper">
                <span className="text-lg font-bold text-text-secondary mr-2">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0"
                  className="font-semibold text-lg"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-text-secondary ml-1 uppercase tracking-wider block mb-1.5">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform active:scale-95"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check size={20} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSaveGoal}
            disabled={!isGoalValid}
            className="w-full py-4 bg-coral text-bg rounded-2xl font-bold active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            Create Goal
          </button>
        </div>
      </Drawer>
    </div>
  );
}
