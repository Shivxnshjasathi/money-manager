import { NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, PieChart, Wallet, MoreHorizontal, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/transactions', icon: CalendarDays, label: 'Trans.' },
  { to: '/stats', icon: PieChart, label: 'Stats' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/more', icon: MoreHorizontal, label: 'More' },
];

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="relative flex items-end bg-surface/85 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)] z-20">
      {navItems.map((item, idx) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors duration-200
            ${idx === 1 ? 'mr-8' : ''} ${idx === 2 ? 'ml-8' : ''}
            ${isActive ? 'text-coral' : 'text-text-secondary hover:text-text-primary'}`
          }
        >
          {({ isActive }) => (
            <motion.div 
              whileTap={{ scale: 0.85 }}
              animate={isActive ? { y: -2 } : { y: 0 }}
              className="flex flex-col items-center gap-0.5"
            >
              <item.icon size={22} strokeWidth={1.8} />
              <span className="text-[11px] font-medium">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="bottom-nav-indicator"
                  className="w-1 h-1 bg-coral rounded-full mt-0.5"
                />
              )}
            </motion.div>
          )}
        </NavLink>
      ))}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => navigate('/add')}
        className="absolute left-1/2 -translate-x-1/2 -top-7 w-14 h-14 rounded-full bg-coral text-white
                   flex items-center justify-center shadow-[0_4px_16px_rgba(255,90,95,0.45)]"
        aria-label="Add transaction"
      >
        <Plus size={28} strokeWidth={2.5} />
      </motion.button>
    </nav>
  );
}
