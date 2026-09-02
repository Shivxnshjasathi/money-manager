import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import TransactionsList from './pages/TransactionsList';
import Stats from './pages/Stats';
import Accounts from './pages/Accounts';
import AccountDetails from './pages/AccountDetails';
import AddTransaction from './pages/AddTransaction';
import More from './pages/More';
import Budgets from './pages/Budgets';
import Goals from './pages/Goals';
import Notifications from './pages/Notifications';
import PrivacySecurity from './pages/PrivacySecurity';
import Subscriptions from './pages/Subscriptions';
import BottomNav from './components/BottomNav';
import { seedDatabase, processRecurringTransactions } from './db';
import { useTheme } from './hooks';
import './index.css';

import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const showNav = ['/transactions', '/stats', '/accounts', '/more'].includes(location.pathname);
  const hideNav = !showNav;

  return (
    <div className="flex justify-center min-h-dvh bg-black">
      <div className="@container flex flex-col w-full max-w-md h-dvh bg-bg text-text-primary overflow-hidden selection:bg-coral/30 relative shadow-2xl ring-1 ring-border/20 md:border-x md:border-border">
        <main className={`flex-1 flex flex-col overflow-hidden relative ${!hideNav ? 'pb-14' : ''}`}>
          {children}
        </main>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/transactions" replace />} />
        <Route path="/transactions" element={<PageTransition><TransactionsList /></PageTransition>} />
        <Route path="/stats" element={<PageTransition><Stats /></PageTransition>} />
        <Route path="/accounts" element={<PageTransition><Accounts /></PageTransition>} />
        <Route path="/accounts/:id" element={<PageTransition><AccountDetails /></PageTransition>} />
        <Route path="/more" element={<PageTransition><More /></PageTransition>} />
        <Route path="/budgets" element={<PageTransition><Budgets /></PageTransition>} />
        <Route path="/goals" element={<PageTransition><Goals /></PageTransition>} />
        <Route path="/notifications" element={<PageTransition><Notifications /></PageTransition>} />
        <Route path="/privacy-security" element={<PageTransition><PrivacySecurity /></PageTransition>} />
        <Route path="/subscriptions" element={<PageTransition><Subscriptions /></PageTransition>} />
        <Route path="/add" element={<PageTransition><AddTransaction /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [ready, setReady] = useState(false);
  const theme = useTheme((state) => state.theme);

  useEffect(() => {
    seedDatabase()
      .then(() => processRecurringTransactions())
      .then(() => setReady(true));
  }, []);

  useEffect(() => {
    const metaThemeColor = document.getElementById('meta-theme-color');
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#FFFFFF');
    } else {
      document.documentElement.classList.remove('light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#000000');
    }
  }, [theme]);

  if (!ready) {
    return (
      <div className="flex flex-col h-screen w-full bg-bg px-4 overflow-hidden pt-[env(safe-area-inset-top)] relative">
        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 z-50 pointer-events-none w-[200%] animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] translate-x-[-100%]"></div>
        
        {/* TopBar Skeleton */}
        <div className="h-14 flex items-center justify-between mb-2 mt-2">
          <div className="w-12 h-12 bg-surface/50 rounded-full"></div>
          <div className="w-32 h-6 bg-surface/50 rounded-lg"></div>
          <div className="w-12 h-12 bg-surface/50 rounded-full"></div>
        </div>
        
        {/* Tabs Skeleton */}
        <div className="flex gap-2 mb-6 h-10 w-48 mx-auto bg-surface/50 rounded-2xl p-1"></div>

        {/* Transactions Skeleton */}
        <div className="flex flex-col gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-full h-[76px] bg-surface/40 rounded-2xl border border-border/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-surface/60"></div>
                <div className="flex flex-col gap-2">
                  <div className="w-24 h-4 bg-surface/60 rounded"></div>
                  <div className="w-16 h-3 bg-surface/40 rounded"></div>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className="w-16 h-4 bg-surface/60 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Nav Skeleton */}
        <div className="absolute bottom-0 left-0 right-0 h-[88px] bg-bg/85 backdrop-blur-xl border-t border-border flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`w-12 h-12 rounded-full ${i === 2 ? 'bg-coral/30 -mt-6 border-4 border-bg' : 'bg-surface/50'}`}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <AppRoutes />
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
