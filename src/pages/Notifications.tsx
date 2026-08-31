import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, Clock } from 'lucide-react';
import TopBar from '../components/TopBar';

export default function Notifications() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('21:00'); // 9:00 PM
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    const savedEnabled = localStorage.getItem('dailyReminderEnabled') === 'true';
    const savedTime = localStorage.getItem('dailyReminderTime');
    if (savedEnabled) setEnabled(true);
    if (savedTime) setTime(savedTime);
  }, []);

  const handleToggle = async () => {
    if (!enabled) {
      // Trying to enable
      if ('Notification' in window) {
        if (Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission();
          setPermission(perm);
          if (perm !== 'granted') {
            alert('Notification permission denied. Please enable them in your browser settings.');
            return;
          }
        }
      } else {
        alert('Your browser does not support notifications.');
        return;
      }
      
      setEnabled(true);
      localStorage.setItem('dailyReminderEnabled', 'true');
      
      // Test notification
      new Notification('Daily Reminder Enabled!', {
        body: `We'll remind you to add your transactions every day at ${time}.`,
        icon: '/pwa-192x192.png'
      });
    } else {
      // Disabling
      setEnabled(false);
      localStorage.setItem('dailyReminderEnabled', 'false');
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
    localStorage.setItem('dailyReminderTime', e.target.value);
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg">
      <TopBar title="Notifications" onPrev={() => navigate(-1)} />
      
      <div className="flex-1 overflow-y-auto pb-8 p-4">
        
        <div className="flex justify-center my-8">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-500 shadow-xl ${enabled ? 'bg-coral shadow-coral/20' : 'bg-surface border border-border'}`}>
            {enabled ? <BellRing size={40} className="text-bg animate-pulse" /> : <Bell size={40} className="text-text-tertiary" />}
          </div>
        </div>
        
        <div className="text-center mb-8 px-4">
          <h2 className="text-2xl font-bold mb-2">Daily Reminder</h2>
          <p className="text-sm text-text-secondary">Get a gentle nudge at night to log your daily transactions, so you never miss a beat.</p>
        </div>

        <div className="bg-surface/50 rounded-3xl border border-border/50 shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center">
                <Bell size={20} className="text-text-primary" />
              </div>
              <div>
                <span className="text-[16px] font-bold block">Enable Reminder</span>
                <span className="text-[12px] text-text-secondary font-medium mt-0.5 block">Push notification alerts</span>
              </div>
            </div>
            
            <button 
              onClick={handleToggle}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${enabled ? 'bg-coral' : 'bg-elevated'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <div className={`transition-all duration-300 overflow-hidden ${enabled ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-elevated flex items-center justify-center">
                  <Clock size={20} className="text-text-primary" />
                </div>
                <span className="text-[16px] font-bold block">Reminder Time</span>
              </div>
              <input 
                type="time" 
                value={time}
                onChange={handleTimeChange}
                className="bg-elevated text-text-primary font-bold px-3 py-1.5 rounded-lg border border-border/50 outline-none"
              />
            </div>
          </div>
        </div>

        {permission === 'denied' && (
          <div className="bg-expense/10 border border-expense/20 rounded-2xl p-4 text-center">
            <p className="text-expense text-sm font-semibold mb-1">Notifications Blocked</p>
            <p className="text-text-secondary text-xs">You have blocked notifications in your browser settings. Please unblock them to use this feature.</p>
          </div>
        )}
        
        <div className="mt-8 text-center px-6">
          <p className="text-xs text-text-tertiary font-medium">Note: On iOS, web push notifications may require the app to be added to your Home Screen to work reliably.</p>
        </div>
      </div>
    </div>
  );
}
