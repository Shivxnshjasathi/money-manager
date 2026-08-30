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
import BottomNav from './components/BottomNav';
import { seedDatabase, processRecurringTransactions } from './db';
import { useTheme } from './hooks';
import './index.css';

import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hideNav = location.pathname === '/add' || location.pathname.startsWith('/accounts/');

  return (
    <div className="flex flex-col h-dvh bg-bg text-text-primary overflow-hidden">
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
      {!hideNav && <BottomNav />}
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
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#F2F2F7');
    } else {
      document.documentElement.classList.remove('light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#121214');
    }
  }, [theme]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-coral flex items-center justify-center text-white text-2xl font-bold animate-pulse">
            ₹
          </div>
          <span className="text-text-secondary text-sm">Loading…</span>
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
