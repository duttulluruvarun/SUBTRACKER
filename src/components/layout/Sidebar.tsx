import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { LayoutDashboard, CalendarClock, CreditCard, LayoutTemplate, Sparkles, Bell, Settings, RefreshCw, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar() {
  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const userName = useAppStore((state) => state.userName);
  const userEmail = useAppStore((state) => state.userEmail);
  const userAvatar = useAppStore((state) => state.userAvatar);
  const authProvider = useAppStore((state) => state.authProvider);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [offlineCsv, setOfflineCsv] = useState(true);
  const [mlTraining, setMlTraining] = useState(false);

  const handleExportData = () => {
    const data = JSON.stringify({ name: 'Nitin', plan: 'Premium', joinDate: '2026-08-01' }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtracker_export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    setIsSettingsOpen(false);
    setCurrentView('landing');
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'recurring', label: 'Subscriptions', icon: <CalendarClock size={20} /> },
    { id: 'mandates', label: 'SVI Radar', icon: <Sparkles size={20} /> },
    { id: 'spending', label: 'Spending', icon: <CreditCard size={20} /> },
    { id: 'budgets', label: 'Budgets', icon: <LayoutTemplate size={20} /> },
  ] as const;

  return (
    <>
    {/* Mobile Top Header (always visible on mobile & landscape phone up to lg) */}
    <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-[#ECECEE] z-40 px-4 flex items-center justify-between shadow-xs">
      <div 
        className="flex items-center space-x-2 text-brand-crimson cursor-pointer select-none" 
        onClick={() => setCurrentView('dashboard')}
      >
        <RefreshCw size={20} className="stroke-[3px]" />
        <span className="text-lg font-extrabold tracking-tight text-gray-900">SubTracker</span>
      </div>

      <div className="flex items-center space-x-1">
        {/* Notifications Icon Button */}
        <button 
          onClick={() => {
            setIsNotificationsOpen(!isNotificationsOpen);
            setIsSettingsOpen(false);
          }}
          className={clsx(
            "relative p-2 rounded-xl transition-colors",
            isNotificationsOpen ? "bg-red-50 text-brand-crimson" : "text-gray-600 hover:bg-gray-100"
          )}
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-crimson opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-crimson"></span>
          </span>
        </button>

        {/* Settings Gear Button */}
        <button 
          onClick={() => {
            setIsSettingsOpen(true);
            setIsNotificationsOpen(false);
          }}
          className={clsx(
            "p-2 rounded-xl transition-colors",
            isSettingsOpen ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100"
          )}
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={20} />
        </button>

        {/* User Avatar Button */}
        <button 
          onClick={() => {
            setIsSettingsOpen(true);
            setIsNotificationsOpen(false);
          }}
          className="ml-1 rounded-full ring-2 ring-gray-100 focus:outline-none"
          title="Account Settings"
        >
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-light text-brand-crimson font-bold flex items-center justify-center text-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
        </button>
      </div>
    </header>

    {/* Desktop Sidebar (Only visible on lg: 1024px+ screens, preventing rotation spawn on phones) */}
    <aside className="hidden lg:flex w-[240px] fixed top-0 left-0 h-screen bg-white border-r border-[#ECECEE] flex-col pt-6 pb-4 z-40">
      <div className="px-6 mb-8 flex items-center space-x-2 text-brand-crimson cursor-pointer" onClick={() => setCurrentView('landing')}>
        <RefreshCw size={24} className="stroke-[3px]" />
        <span className="text-xl font-extrabold tracking-tight text-gray-900">SubTracker</span>
      </div>

      <div className="px-6 mb-8 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-crimson/20" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand-light text-brand-crimson font-bold flex items-center justify-center text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 leading-tight truncate max-w-[130px]">{userName}</h2>
            <div className="flex items-center space-x-1 mt-0.5">
              {authProvider === 'google' && (
                <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              )}
              <p className="text-[11px] text-gray-500 font-medium">{authProvider === 'google' ? 'Google Account' : 'Premium Member'}</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as any)}
              className={clsx(
                "w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-[15px] font-medium transition-colors",
                isActive 
                  ? "bg-brand-light text-brand-crimson" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <div className={clsx("flex items-center justify-center", isActive ? "text-brand-crimson" : "text-gray-400")}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-4 mt-auto space-y-1 relative">
        {/* Notifications Button */}
        <button 
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-[15px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          onClick={() => {
            setIsNotificationsOpen(!isNotificationsOpen);
            setIsSettingsOpen(false);
          }}
        >
          <div className="relative text-gray-400">
            <Bell size={20} />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-crimson rounded-full border border-white"></div>
          </div>
          <span>Notifications</span>
        </button>

        {/* Settings Button */}
        <button 
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-[15px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          onClick={() => {
            setIsSettingsOpen(true);
            setIsNotificationsOpen(false);
          }}
        >
          <div className="text-gray-400">
            <Settings size={20} />
          </div>
          <span>Settings</span>
        </button>
      </div>

    </aside>

    {/* Responsive Notifications Drawer / Popover with Backdrop */}
    {isNotificationsOpen && (
      <>
        <div 
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[1px]" 
          onClick={() => setIsNotificationsOpen(false)} 
        />
        
        <div className="fixed top-16 right-3 lg:top-auto lg:bottom-24 lg:left-4 lg:right-auto w-[calc(100vw-24px)] max-w-sm bg-white rounded-2xl shadow-2xl border border-[#ECECEE] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 lg:slide-in-from-bottom-2 duration-200">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/60">
            <div className="flex items-center space-x-2">
              <Bell size={16} className="text-brand-crimson" />
              <h4 className="font-bold text-gray-900 text-sm">Notifications</h4>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-brand-crimson bg-brand-light px-2 py-0.5 rounded-full">2 New</span>
              <button 
                onClick={() => setIsNotificationsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            <div 
              onClick={() => {
                setCurrentView('mandates');
                setIsNotificationsOpen(false);
              }}
              className="p-4 hover:bg-red-50/40 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-[#D9222A] transition-colors">Zombie Subscription Detected</p>
                <span className="w-2 h-2 rounded-full bg-[#D9222A] shrink-0 mt-1"></span>
              </div>
              <p className="text-[12px] text-gray-500 mt-1">You haven't used Cult.fit Pass & Adobe CC in 2 months. Consider canceling to save money.</p>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-[10px] text-gray-400 font-medium">10 mins ago</span>
                <span className="text-[11px] font-bold text-[#D9222A]">Open SVI Radar →</span>
              </div>
            </div>

            <div 
              onClick={() => {
                setCurrentView('spending');
                setIsNotificationsOpen(false);
              }}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">New Statement Parsed</p>
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1"></span>
              </div>
              <p className="text-[12px] text-gray-500 mt-1">Successfully ingested statement. Found 32 transactions and categorized 6 recurring mandating merchants.</p>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-[10px] text-gray-400 font-medium">2 hours ago</span>
                <span className="text-[11px] font-bold text-blue-600">View Spending →</span>
              </div>
            </div>
          </div>
        </div>
      </>
    )}
    
    {/* Settings Modal */}
    {isSettingsOpen && (
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-[#ECECEE] animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center p-6 border-b border-gray-50">
            <h3 className="text-xl font-extrabold text-gray-900">Settings</h3>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-6">
            
            {/* Account Info */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3">Account Information</h4>
              <div className="bg-gray-50 rounded-xl p-4 border border-[#ECECEE]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] text-gray-500 font-medium">Name</span>
                  <span className="text-[13px] font-bold text-gray-900">{userName}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] text-gray-500 font-medium">Email</span>
                  <span className="text-[13px] font-bold text-gray-900">{userEmail}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] text-gray-500 font-medium">Auth Provider</span>
                  <span className="text-[12px] font-semibold text-gray-800 flex items-center space-x-1.5">
                    {authProvider === 'google' ? (
                      <>
                        <svg className="w-3.5 h-3.5 inline shrink-0" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        </svg>
                        <span>Google OAuth</span>
                      </>
                    ) : (
                      <span>Email & Password</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] text-gray-500 font-medium">Plan</span>
                  <span className="text-[11px] font-bold text-brand-crimson bg-brand-light px-2 py-1 rounded-full uppercase tracking-wider">Premium</span>
                </div>
              </div>
            </div>

            {/* Privacy & Data */}
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3">Privacy & Data</h4>
              <div className="bg-gray-50 rounded-xl p-4 border border-[#ECECEE] space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[13px] font-bold text-gray-900">Offline CSV Parsing</p>
                    <p className="text-[11px] text-gray-500">Your bank statements are processed locally.</p>
                  </div>
                  <div 
                    onClick={() => setOfflineCsv(!offlineCsv)}
                    className={clsx("w-10 h-6 rounded-full relative cursor-pointer transition-colors", offlineCsv ? "bg-brand-crimson" : "bg-gray-300")}
                  >
                    <div className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", offlineCsv ? "right-1" : "left-1")}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[13px] font-bold text-gray-900">ML Training Data</p>
                    <p className="text-[11px] text-gray-500">Allow anonymized usage for DBSCAN training.</p>
                  </div>
                  <div 
                    onClick={() => setMlTraining(!mlTraining)}
                    className={clsx("w-10 h-6 rounded-full relative cursor-pointer transition-colors", mlTraining ? "bg-brand-crimson" : "bg-gray-300")}
                  >
                    <div className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", mlTraining ? "right-1" : "left-1")}></div>
                  </div>
                </div>
                <button 
                  onClick={handleExportData}
                  className="text-[13px] font-bold text-brand-crimson w-full text-left py-2 hover:bg-brand-light rounded-lg px-2 -mx-2 transition-colors"
                >
                  Export My Data
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-2">
              <button 
                onClick={handleLogout}
                className="w-full bg-red-50 text-red-600 font-bold py-3.5 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
              >
                Log Out
              </button>
            </div>
            
          </div>
        </div>
      </div>
    )}

    {/* Mobile Bottom Navigation */}
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-white border-t border-[#ECECEE] z-50 flex items-center overflow-x-auto no-scrollbar px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex w-max min-w-full justify-around items-center h-full px-2 space-x-2">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as any)}
              className={clsx(
                "flex flex-col items-center justify-center min-w-[70px] h-[56px] rounded-xl transition-all duration-200",
                isActive 
                  ? "text-brand-crimson bg-brand-light font-bold" 
                  : "text-gray-400 hover:text-gray-900 font-medium"
              )}
            >
              <div className="mb-1">
                {item.icon}
              </div>
              <span className="text-[10px] whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
    </>
  );
}
