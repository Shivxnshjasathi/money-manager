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
  const [color, setColor] = useState('#0ABDE3');

  const COLORS = ['#FF5A5F', '#FF9F43', '#FECA57', '#48DBFB', '#0ABDE3', '#10AC84', '#EE5A24', '#A29BFE', '#FD79A8'];

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
      <div className="flex items-center justify-between px-4 h-14 pt-[env(safe-area-inset-top)] shrink-0 border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft size={28} />
        </button>
        <span className="text-lg font-semibold">Savings Goals</span>
        <button onClick={() => setShowAddDrawer(true)} className="p-1">
          <Plus size={28} />
        </button>
      </div>

      {/* Content */}
      <motion.div 
        variants={listVariants} 
        initial="hidden" 
        animate="visible"
        className="flex-1 overflow-y-auto p-4 space-y-4"
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
                  className="bg-surface rounded-2xl p-5 border border-border shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
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

                  <div className="relative h-2 bg-elevated rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="absolute top-0 left-0 h-full rounded-full transition-all"
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
                    className="mt-4 w-full py-2 bg-elevated rounded-lg text-sm font-medium active:scale-95 transition-all"
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
              <label className="text-xs text-text-secondary mb-1 block">Goal Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Vacation to Bali"
                className="w-full bg-elevated px-4 py-3 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Target Amount (₹)</label>
              <input
                type="number"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-elevated px-4 py-3 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-2 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95"
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
            disabled={!name || !targetAmount}
            className="w-full py-3.5 bg-coral text-white rounded-xl font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            Create Goal
          </button>
        </div>
      </Drawer>
    </div>
  );
}
