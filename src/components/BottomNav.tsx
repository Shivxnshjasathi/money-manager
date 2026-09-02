import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, PieChart, Wallet, MoreHorizontal, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { playFeedback } from '../utils/feedback';
import { useUIStore } from '../hooks';

const navItems = [
  { to: '/transactions', icon: CalendarDays, label: 'Trans.' },
  { to: '/stats', icon: PieChart, label: 'Stats' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const isScrollingDown = useUIStore(s => s.isScrollingDown);

  return (
    <motion.div 
      initial={false}
      animate={{ y: isScrollingDown ? 150 : 0, opacity: isScrollingDown ? 0 : 1 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute bottom-4 left-5 right-5 pointer-events-none z-50"
    >
      <nav className="relative flex items-center justify-between px-4 h-12 bg-surface/95 backdrop-blur-3xl border border-border rounded-full shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4)] pointer-events-auto w-full max-w-md mx-auto">
        {navItems.map((item, idx) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => playFeedback.tap()}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center h-full transition-all duration-300
              ${idx === 1 ? 'mr-10' : ''} ${idx === 2 ? 'ml-10' : ''}
              ${isActive ? 'text-coral' : 'text-text-secondary hover:text-text-primary'}`
            }
          >
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.75, rotate: -8 }}
                animate={isActive ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                className="flex flex-col items-center justify-center relative w-full h-full"
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {/* Active dot indicator */}
                {isActive && (
                  <motion.div 
                    layoutId="nav-dot"
                    className="absolute bottom-1.5 w-1 h-1 rounded-full bg-coral"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}

        {/* FAB with glow */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 pointer-events-auto">
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full bg-coral/20 blur-xl scale-150 animate-pulse" />
          <motion.button
            whileTap={{ scale: 0.85, rotate: 45 }}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            onClick={() => { playFeedback.tap(); navigate('/add'); }}
            className="relative w-[52px] h-[52px] rounded-[20px] bg-coral text-bg
                       flex items-center justify-center shadow-lg shadow-coral/30 border-[3px] border-bg"
            aria-label="Add transaction"
          >
            <Plus size={28} strokeWidth={2.5} />
          </motion.button>
        </div>
      </nav>
    </motion.div>
  );
}
