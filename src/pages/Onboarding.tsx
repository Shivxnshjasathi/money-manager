import { useState } from 'react';
import { Cloud, Smartphone, ArrowRight, Shield, Wifi, WifiOff, RefreshCw, Lock, Sparkles, Mail, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { setAppMode, signInWithEmail, signUpWithEmail } from '../firebase';
import { uploadAllToCloud } from '../utils/syncService';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'choice' | 'email-auth' | 'signing-in' | 'syncing'>('welcome');
  const [error, setError] = useState('');
  
  // Email auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);

  const handleCloud = () => {
    setStep('email-auth');
    setError('');
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoadingAuth(true);
    setError('');
    
    try {
      let user;
      if (isSignUp) {
        user = await signUpWithEmail(email, password);
      } else {
        user = await signInWithEmail(email, password);
      }

      if (user) {
        setStep('syncing');
        setAppMode('cloud');
        // Upload any existing local data to cloud
        await uploadAllToCloud();
        onComplete();
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Try signing in instead.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleOffline = () => {
    setAppMode('offline');
    onComplete();
  };

  return (
    <div className="flex justify-center min-h-dvh bg-black">
      <div className="flex flex-col w-full max-w-md h-dvh bg-bg text-text-primary overflow-hidden relative">
        {/* Background decorations */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-coral/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-20 right-0 w-[300px] h-[300px] bg-income/5 rounded-full blur-[100px] pointer-events-none" />

        <AnimatePresence mode="wait">
          {/* ── Welcome Screen ──────────────────────── */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center px-8 relative z-10"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-coral to-coral/70 flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(255,107,107,0.3)]"
              >
                <Sparkles size={44} className="text-bg" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-black tracking-tight mb-3"
              >
                Manifest
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-text-secondary text-center text-[15px] leading-relaxed mb-2"
              >
                Manifest your wealth.
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-text-tertiary text-center text-xs leading-relaxed mb-12 max-w-[260px]"
              >
                Track expenses, set budgets, achieve savings goals — all in a beautiful, private app.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setStep('choice')}
                className="flex items-center gap-3 bg-coral text-bg px-8 py-4 rounded-2xl font-bold text-[15px] shadow-[0_4px_24px_rgba(255,107,107,0.3)] active:shadow-[0_2px_12px_rgba(255,107,107,0.2)] transition-shadow"
              >
                Get Started
                <ArrowRight size={18} />
              </motion.button>
            </motion.div>
          )}

          {/* ── Mode Choice Screen ─────────────────── */}
          {step === 'choice' && (
            <motion.div
              key="choice"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col px-6 relative z-10"
              style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
            >
              <div className="mt-8 mb-6">
                <h2 className="text-2xl font-black tracking-tight mb-2">How do you want to use Manifest?</h2>
                <p className="text-text-secondary text-sm">You can change this later in Settings.</p>
              </div>

              {/* Cloud Card */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCloud}
                className="w-full text-left bg-surface rounded-2xl border border-border/50 p-5 mb-3 relative overflow-hidden group active:border-coral/50 transition-colors"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-coral/5 rounded-full blur-3xl -mr-10 -mt-10 group-active:bg-coral/10 transition-colors" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-coral/10 flex items-center justify-center">
                      <Cloud size={22} className="text-coral" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[15px]">Cloud Sync</h3>
                      <span className="text-[11px] text-coral font-bold uppercase tracking-wider">Recommended</span>
                    </div>
                    <ArrowRight size={18} className="text-text-tertiary ml-auto" />
                  </div>
                  <div className="space-y-2 ml-1">
                    <div className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                      <Wifi size={14} className="text-income shrink-0" />
                      <span>Create an account — sync across devices</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                      <RefreshCw size={14} className="text-income shrink-0" />
                      <span>Automatic cloud backup — never lose data</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                      <Shield size={14} className="text-income shrink-0" />
                      <span>Your data is encrypted & private</span>
                    </div>
                  </div>
                </div>
              </motion.button>

              {/* Offline Card */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleOffline}
                className="w-full text-left bg-surface rounded-2xl border border-border/50 p-5 relative overflow-hidden group active:border-text-secondary/30 transition-colors"
              >
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-elevated flex items-center justify-center">
                      <Smartphone size={22} className="text-text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[15px]">Offline Only</h3>
                      <span className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">Maximum Privacy</span>
                    </div>
                    <ArrowRight size={18} className="text-text-tertiary ml-auto" />
                  </div>
                  <div className="space-y-2 ml-1">
                    <div className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                      <WifiOff size={14} className="text-text-tertiary shrink-0" />
                      <span>No internet required — works 100% offline</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                      <Lock size={14} className="text-text-tertiary shrink-0" />
                      <span>Data never leaves your device</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                      <Smartphone size={14} className="text-text-tertiary shrink-0" />
                      <span>No account or sign-up needed</span>
                    </div>
                  </div>
                </div>
              </motion.button>
              
              <p className="text-text-tertiary text-[11px] text-center mt-6 leading-relaxed px-4">
                Both modes store data locally on your device for instant access.
                Cloud mode additionally syncs to Firebase for backup & multi-device access.
              </p>
            </motion.div>
          )}

          {/* ── Email Auth Form ──────────────────────── */}
          {step === 'email-auth' && (
            <motion.div
              key="email-auth"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col px-6 relative z-10"
              style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))' }}
            >
              <div className="mt-8 mb-8">
                <button 
                  onClick={() => { setStep('choice'); setError(''); }}
                  className="text-text-tertiary mb-4 flex items-center gap-1 active:text-text-primary transition-colors"
                >
                  <ArrowRight size={16} className="rotate-180" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                <h2 className="text-2xl font-black tracking-tight mb-2">
                  {isSignUp ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p className="text-text-secondary text-sm">
                  {isSignUp 
                    ? 'Sign up to enable Cloud Sync and backup your data.'
                    : 'Sign in to access your Cloud Sync data.'}
                </p>
              </div>

              <form onSubmit={handleEmailAuthSubmit} className="flex flex-col gap-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-text-tertiary" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full bg-surface/50 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-[15px] focus:outline-none focus:border-coral transition-colors"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key size={18} className="text-text-tertiary" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className="w-full bg-surface/50 border border-border/50 rounded-2xl py-4 pl-12 pr-4 text-[15px] focus:outline-none focus:border-coral transition-colors"
                  />
                </div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 bg-expense/10 border border-expense/20 rounded-2xl text-expense text-xs text-center font-medium">
                        {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loadingAuth}
                  className="w-full bg-coral text-bg py-4 rounded-2xl font-bold text-[15px] shadow-[0_4px_24px_rgba(255,107,107,0.3)] active:shadow-[0_2px_12px_rgba(255,107,107,0.2)] transition-shadow mt-2 flex items-center justify-center disabled:opacity-70 disabled:active:shadow-[0_4px_24px_rgba(255,107,107,0.3)]"
                >
                  {loadingAuth ? (
                    <div className="w-5 h-5 rounded-full border-2 border-bg border-t-transparent animate-spin" />
                  ) : (
                    isSignUp ? 'Sign Up' : 'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="text-[13px] text-text-secondary active:text-text-primary transition-colors"
                >
                  {isSignUp ? (
                    <>Already have an account? <span className="text-coral font-bold">Sign In</span></>
                  ) : (
                    <>Don't have an account? <span className="text-coral font-bold">Sign Up</span></>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Syncing Screen ──────────────────── */}
          {step === 'syncing' && (
            <motion.div
              key="syncing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-8 relative z-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="w-16 h-16 rounded-full border-4 border-border border-t-coral mb-6"
              />
              <h3 className="text-lg font-bold mb-2">
                Syncing your data...
              </h3>
              <p className="text-text-secondary text-sm text-center">
                Uploading your existing data to the cloud.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
