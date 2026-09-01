import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Fingerprint, Database, CloudOff } from 'lucide-react';
import TopBar from '../components/TopBar';

export default function PrivacySecurity() {
  const navigate = useNavigate();
  const [appLock, setAppLock] = useState(false);

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      <TopBar title="Privacy & Security" onPrev={() => navigate(-1)} />
      
      <div className="flex-1 overflow-y-auto pb-8 p-4">
        
        <div className="flex justify-center my-8">
          <div className="w-24 h-24 rounded-2xl bg-coral/10 border border-coral/20 flex items-center justify-center shadow-lg shadow-coral/5">
            <ShieldCheck size={48} className="text-coral" />
          </div>
        </div>
        
        <div className="text-center mb-8 px-4">
          <h2 className="text-2xl font-bold mb-2">100% Private</h2>
          <p className="text-sm text-text-secondary">Your financial data never leaves your device. It is stored completely offline and securely in your browser.</p>
        </div>

        <div className="bg-surface/50 rounded-2xl border border-border/50 shadow-sm overflow-hidden mb-6 p-2 space-y-2">
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg border border-border/30">
            <div className="w-12 h-12 rounded-2xl bg-elevated flex items-center justify-center shrink-0">
              <Database size={22} className="text-coral" />
            </div>
            <div>
              <span className="text-[15px] font-bold block mb-0.5">Local Storage Only</span>
              <p className="text-[12px] text-text-secondary leading-snug">All transactions and budgets are stored exclusively in your device's local database.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg border border-border/30">
            <div className="w-12 h-12 rounded-2xl bg-elevated flex items-center justify-center shrink-0">
              <CloudOff size={22} className="text-coral" />
            </div>
            <div>
              <span className="text-[15px] font-bold block mb-0.5">No Servers, No Trackers</span>
              <p className="text-[12px] text-text-secondary leading-snug">This app does not sync your data to any cloud service. You are in complete control.</p>
            </div>
          </div>

        </div>

        <div className="px-2 mt-8 mb-3">
          <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-2">App Security</span>
        </div>

        <div className="bg-surface/50 rounded-2xl border border-border/50 shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-elevated flex items-center justify-center">
                <Fingerprint size={20} className="text-text-primary" />
              </div>
              <div>
                <span className="text-[16px] font-bold block">Biometric App Lock</span>
                <span className="text-[12px] text-text-secondary font-medium mt-0.5 block">Require FaceID / TouchID</span>
              </div>
            </div>
            
            <button 
              onClick={() => setAppLock(!appLock)}
              className={`relative inline-flex h-7 w-12 items-center rounded-2xl transition-colors duration-300 focus:outline-none ${appLock ? 'bg-coral' : 'bg-elevated'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-2xl bg-white transition-transform duration-300 ${appLock ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {appLock && (
            <div className="px-5 pb-5 pt-2 text-[12px] text-text-tertiary border-t border-border/30 mx-5 mt-2">
              Note: Full biometric lock support requires specific OS integrations. This feature serves as an interface placeholder for the web context.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
