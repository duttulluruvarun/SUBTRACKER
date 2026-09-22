import { useState, useMemo, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useAppStore, type Subscription } from '../store/useAppStore';
import ManageSubscriptionModal from '../components/subscription/ManageSubscriptionModal';
import { 
  PlayCircle, PauseCircle, 
  Bell, Clock, CheckCircle2, 
  ExternalLink, Lock, Flame, Sparkles, 
  AlertTriangle, LineChart, Sliders
} from 'lucide-react';
import { clsx } from 'clsx';

export default function AutoPayRadarView() {
  const subscriptions = useAppStore(state => state.subscriptions);
  const updateSubscription = useAppStore(state => state.updateSubscription);
  const isUsagePermissionGranted = useAppStore(state => state.isUsagePermissionGranted);
  const appUsageData = useAppStore(state => state.appUsageData);
  const checkUsagePermission = useAppStore(state => state.checkUsagePermission);
  const requestUsagePermission = useAppStore(state => state.requestUsagePermission);
  const fetchAppUsage = useAppStore(state => state.fetchAppUsage);

  const [activeModalSub, setActiveModalSub] = useState<Subscription | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'plan' | 'autopay' | 'svi' | 'cancel'>('autopay');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Zombies' | 'Active' | 'Paused'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);

  useEffect(() => {
    checkUsagePermission();
  }, [checkUsagePermission]);

  useEffect(() => {
    if (isUsagePermissionGranted && !appUsageData) {
      fetchAppUsage();
    }
  }, [isUsagePermissionGranted, appUsageData, fetchAppUsage]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to parse dates
  const parseDueDate = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    const d2 = new Date(`${dateStr}, 2026`);
    if (!isNaN(d2.getTime())) return d2;
    return null;
  };

  // Calculate monthly equivalent
  const getMonthlyEquivalent = (sub: { amount: number; cycle: string; isPaused?: boolean }) => {
    if (sub.isPaused) return 0;
    if (sub.cycle === 'Annual') return sub.amount / 12;
    if (sub.cycle === 'Quarterly') return sub.amount / 3;
    if (sub.cycle === 'Weekly') return sub.amount * 4.33;
    return sub.amount;
  };

  const getAnnualCost = (sub: { amount: number; cycle: string }) => {
    if (sub.cycle === 'Annual') return sub.amount;
    if (sub.cycle === 'Quarterly') return sub.amount * 4;
    if (sub.cycle === 'Weekly') return sub.amount * 52;
    return sub.amount * 12;
  };

  // Zombie subscriptions & potential savings
  const zombieSubs = useMemo(() => subscriptions.filter(s => s.isZombie), [subscriptions]);
  const totalAnnualLeakage = useMemo(() => zombieSubs.reduce((sum, s) => sum + getAnnualCost(s), 0), [zombieSubs]);
  const totalMonthlyExposure = useMemo(() => subscriptions.reduce((sum, s) => sum + getMonthlyEquivalent(s), 0), [subscriptions]);
  const pausedCount = useMemo(() => subscriptions.filter(s => s.isPaused).length, [subscriptions]);

  // Imminent pre-debit radar items
  const baseToday = useMemo(() => new Date('2026-09-18T00:00:00'), []);
  const fourteenDaysLater = useMemo(() => new Date(baseToday.getTime() + 14 * 24 * 60 * 60 * 1000), [baseToday]);

  const upcomingRadarItems = useMemo(() => {
    return subscriptions
      .filter(sub => {
        const d = parseDueDate(sub.nextDue);
        if (!d) return false;
        return d >= baseToday && d <= fourteenDaysLater;
      })
      .sort((a, b) => {
        const da = parseDueDate(a.nextDue)?.getTime() || 0;
        const db = parseDueDate(b.nextDue)?.getTime() || 0;
        return da - db;
      });
  }, [subscriptions, baseToday, fourteenDaysLater]);

  // Filtered subscriptions for the list
  const filteredList = useMemo(() => {
    if (activeFilter === 'Zombies') return subscriptions.filter(s => s.isZombie);
    if (activeFilter === 'Paused') return subscriptions.filter(s => s.isPaused);
    if (activeFilter === 'Active') return subscriptions.filter(s => !s.isPaused && !s.isZombie);
    return subscriptions;
  }, [subscriptions, activeFilter]);

  // Direct In-Place Manage Action
  const handleOpenManageInPlace = (sub: Subscription, tab: 'plan' | 'autopay' | 'svi' | 'cancel' = 'autopay') => {
    setActiveModalSub(sub);
    setModalInitialTab(tab);
  };

  const handleTogglePause = (sub: Subscription) => {
    const newPaused = !sub.isPaused;
    updateSubscription(sub.id, { isPaused: newPaused });
    showToast(newPaused ? `Paused ${sub.name} auto-deduction for 30 days.` : `Resumed ${sub.name} AutoPay mandate.`);
  };

  return (
    <div className="flex bg-[#F7F7F8] min-h-screen">
      <Sidebar />
      <main className="lg:ml-[240px] flex-1 p-4 pt-[72px] lg:pt-10 lg:p-10 pb-[100px] lg:pb-10 w-full max-w-7xl mx-auto space-y-8">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-[100] bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-semibold border border-gray-700 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={18} className="text-green-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <span className="p-1.5 bg-red-100 text-[#D9222A] rounded-xl">
                <Sparkles size={22} />
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                SVI & Zombie Radar
              </h1>
            </div>
            <p className="text-[14px] md:text-[15px] text-gray-500 font-medium">
              Screen time value intelligence, zombie subscription killer, and in-place plan & AutoPay management.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {!isUsagePermissionGranted ? (
              <button 
                onClick={requestUsagePermission}
                className="bg-[#D9222A] text-white px-4 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-sm hover:bg-[#B81B22] transition-colors text-xs"
              >
                <LineChart size={15} />
                <span>Connect Screen Time</span>
              </button>
            ) : (
              <span className="bg-green-50 text-green-700 border border-green-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5">
                <CheckCircle2 size={14} className="text-green-600" />
                <span>Screen Time Connected</span>
              </span>
            )}
          </div>
        </div>

        {/* Top Intelligence Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Annual Leakage on Zombies */}
          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[13px] text-gray-500 font-medium">Money Wasted on Unused Services</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center space-x-1">
                <Flame size={12} className="text-[#D9222A]" />
                <span>Zombie Alert</span>
              </span>
            </div>
            <p className="text-3xl font-extrabold text-[#D9222A] mb-1.5 tabular-nums">
              ₹{totalAnnualLeakage.toLocaleString('en-IN')}<span className="text-sm text-gray-500 font-normal">/year</span>
            </p>
            <p className="text-[13px] text-gray-500 font-medium">
              {zombieSubs.length} zero or low-usage subscriptions detected
            </p>
          </div>

          {/* Card 2: AutoPay Commitment */}
          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[13px] text-gray-500 font-medium">Pre-Authorized Auto-Debit</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                Monthly Cap
              </span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-1.5 tabular-nums">
              ₹{totalMonthlyExposure.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[13px] text-gray-500 font-medium">
              {subscriptions.length} e-mandates linked {pausedCount > 0 && `(${pausedCount} paused)`}
            </p>
          </div>

          {/* Card 3: RBI 72h Pre-Debit Shield */}
          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[13px] text-gray-500 font-medium">RBI 72-Hour Pre-Debit Radar</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                Active Shield
              </span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 mb-1.5">
              100% Protected
            </p>
            <p className="text-[13px] text-gray-500 font-medium">
              Mandatory alerts 72h prior to bank deduction
            </p>
          </div>
        </div>

        {/* Pre-Debit Radar (Next 14 Days) */}
        <div className="bg-white rounded-2xl p-5 md:p-8 border border-[#ECECEE] shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <Clock size={18} className="text-[#D9222A]" />
                <h3 className="text-[17px] font-bold text-gray-900">Pre-Debit Radar (Next 14 Days)</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Upcoming auto-debits. Tap Manage to adjust or pause in place before bank deduction occurs.
              </p>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 self-start sm:self-auto">
              Starting Sep 18, 2026
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingRadarItems.map(item => (
              <div 
                key={item.id}
                className={clsx(
                  "p-4 rounded-2xl border transition-all space-y-3",
                  item.isZombie 
                    ? "bg-red-50/40 border-red-200" 
                    : item.isPaused 
                    ? "bg-amber-50/30 border-amber-200" 
                    : "bg-gray-50/60 border-gray-200/70 hover:border-gray-300"
                )}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0", item.iconColor)}>
                      {item.iconInitial}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
                      <p className="text-[11px] text-gray-500 truncate max-w-[140px]">{item.linkedMandate}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-extrabold text-gray-900 tabular-nums">
                      ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-gray-400 font-medium">{item.cycle}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60">
                  <div className="flex items-center space-x-1.5 text-gray-600">
                    <Bell size={13} className={item.isPaused ? "text-gray-400" : "text-blue-600"} />
                    <span className="text-[11px] font-medium">Due {item.nextDue}</span>
                  </div>

                  <span className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    item.isPaused 
                      ? "bg-amber-100 text-amber-800" 
                      : item.isZombie 
                      ? "bg-red-100 text-red-700 font-extrabold" 
                      : "bg-green-100 text-green-700"
                  )}>
                    {item.isPaused ? 'AutoPay Paused' : item.isZombie ? 'Zombie Alert' : '72h Alert Armed'}
                  </span>
                </div>

                {/* Direct in-place action buttons */}
                <div className="pt-1 flex items-center space-x-2">
                  <button
                    onClick={() => handleTogglePause(item)}
                    className={clsx(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-1 border",
                      item.isPaused 
                        ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200" 
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    {item.isPaused ? <PlayCircle size={14} className="text-amber-700" /> : <PauseCircle size={14} className="text-gray-500" />}
                    <span>{item.isPaused ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenManageInPlace(item, item.isZombie ? 'cancel' : 'autopay')}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-gray-800 transition-colors text-center shadow-xs"
                  >
                    Manage
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SVI Usage & Mandates List (With In-Place Management) */}
        <div className="bg-white rounded-2xl p-5 md:p-8 border border-[#ECECEE] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles size={18} className="text-[#D9222A]" />
                <h3 className="text-[17px] font-bold text-gray-900">SVI Intelligence & Mandates Hub</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Review usage value, e-mandates, and kill unused zombie subscriptions in place
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
              {(['All', 'Zombies', 'Active', 'Paused'] as const).map(filterKey => (
                <button
                  key={filterKey}
                  onClick={() => setActiveFilter(filterKey)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap",
                    activeFilter === filterKey
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {filterKey} ({
                    filterKey === 'All' ? subscriptions.length :
                    filterKey === 'Zombies' ? zombieSubs.length :
                    filterKey === 'Paused' ? pausedCount :
                    subscriptions.filter(s => !s.isPaused && !s.isZombie).length
                  })
                </button>
              ))}
            </div>
          </div>

          {/* List of Cards */}
          <div className="space-y-3">
            {filteredList.map(sub => {
              // Cost-per-hour calculation
              const monthlyCost = getMonthlyEquivalent(sub);
              let usageHours = 0;
              if (sub.name.toLowerCase().includes('netflix')) usageHours = 42;
              else if (sub.name.toLowerCase().includes('copilot')) usageHours = 105;
              else if (sub.name.toLowerCase().includes('spotify')) usageHours = 30;
              else if (sub.name.toLowerCase().includes('adobe')) usageHours = 2;
              else if (sub.name.toLowerCase().includes('cult')) usageHours = 0;
              else usageHours = 12;

              const costPerHour = usageHours > 0 ? (monthlyCost / usageHours).toFixed(1) : '∞';

              return (
                <div 
                  key={sub.id} 
                  className={clsx(
                    "p-4 rounded-2xl border transition-all space-y-3",
                    sub.isZombie 
                      ? "bg-red-50/25 border-red-200/80 hover:border-red-300" 
                      : sub.isPaused 
                      ? "bg-amber-50/20 border-amber-200" 
                      : "bg-white border-gray-100 hover:border-gray-200 shadow-xs"
                  )}
                >
                  {/* Top: Icon + Name & Mandate + Amount & SVI Score */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs", sub.iconColor)}>
                        {sub.iconInitial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="text-[14px] font-bold text-gray-900 truncate">{sub.name}</span>
                          {sub.isPaused && (
                            <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded">
                              PAUSED
                            </span>
                          )}
                          {sub.isZombie && (
                            <span className="text-[9px] bg-red-100 text-red-700 font-extrabold px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                              <AlertTriangle size={10} />
                              <span>ZOMBIE</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                          {sub.linkedMandate || 'HDFC UPI AutoPay'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[15px] font-extrabold text-gray-900 tabular-nums">
                        ₹{sub.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium capitalize">
                        {sub.cycle}
                      </div>
                    </div>
                  </div>

                  {/* Middle: SVI Screen Time Metrics & Cost-per-Hour */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div className="bg-gray-50 p-2.5 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-medium">Logged Usage</p>
                      <p className="font-bold text-gray-900 mt-0.5">{usageHours} hrs/mo</p>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-medium">Effective Cost</p>
                      <p className={clsx("font-bold mt-0.5", sub.isZombie ? "text-[#D9222A]" : "text-green-700")}>
                        ₹{costPerHour}/hr
                      </p>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-medium">SVI Metric</p>
                      <p className="font-bold text-gray-800 mt-0.5 truncate">{sub.svi}</p>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-xl">
                      <p className="text-[10px] text-gray-400 font-medium">Next Due Date</p>
                      <p className="font-bold text-gray-800 mt-0.5">{sub.nextDue}</p>
                    </div>
                  </div>

                  {/* Bottom: In-Place Management Controls */}
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => handleTogglePause(sub)}
                      className={clsx(
                        "flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all",
                        sub.isPaused
                          ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      {sub.isPaused ? <PlayCircle size={14} className="text-amber-600" /> : <PauseCircle size={14} className="text-gray-500" />}
                      <span>{sub.isPaused ? 'Resume AutoPay' : 'Pause 30d'}</span>
                    </button>

                    {/* OPEN MANAGE MODAL IN PLACE */}
                    <button
                      onClick={() => handleOpenManageInPlace(sub, 'autopay')}
                      className="flex-[2] py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-xs text-center border flex items-center justify-center space-x-1.5 bg-gray-900 text-white border-transparent hover:bg-gray-800"
                    >
                      <Sliders size={13} />
                      <span>Manage</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredList.length === 0 && (
              <div className="text-center py-10 text-gray-400 font-medium text-sm">
                No items found under this filter.
              </div>
            )}
          </div>
        </div>

        {/* RBI e-Mandate Regulatory Shield Information Banner */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-xl border border-red-500/30">
              <Lock size={20} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">RBI Recurring Payment Framework Protection</h4>
              <p className="text-xs text-gray-400">RBI Circular RBI/2020-21/74 • Maximum ₹15,000 without OTP</p>
            </div>
          </div>

          <p className="text-xs md:text-sm text-gray-300 leading-relaxed max-w-4xl">
            Under Reserve Bank of India regulations, your bank or UPI app (Google Pay, PhonePe, Paytm, BHIM) is legally required to send you a pre-debit alert <strong>at least 24 to 72 hours before</strong> processing any recurring deduction. You have the right to revoke or pause the mandate at any moment without penalty.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedGuide('gpay')}
              className="bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white px-4 py-2 rounded-xl border border-gray-700 transition-colors flex items-center space-x-1.5"
            >
              <span>How to Revoke in Google Pay</span>
              <ExternalLink size={13} />
            </button>
            <button
              onClick={() => setSelectedGuide('phonepe')}
              className="bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white px-4 py-2 rounded-xl border border-gray-700 transition-colors flex items-center space-x-1.5"
            >
              <span>How to Revoke in PhonePe</span>
              <ExternalLink size={13} />
            </button>
            <button
              onClick={() => setSelectedGuide('netbanking')}
              className="bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white px-4 py-2 rounded-xl border border-gray-700 transition-colors flex items-center space-x-1.5"
            >
              <span>NetBanking e-Mandate Portal</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>

      </main>

      {/* REUSABLE IN-PLACE MANAGE SUBSCRIPTION MODAL */}
      {activeModalSub && (
        <ManageSubscriptionModal
          subscription={activeModalSub}
          onClose={() => setActiveModalSub(null)}
          initialTab={modalInitialTab}
          onToast={showToast}
        />
      )}

      {/* Revocation Instructions Modal */}
      {selectedGuide && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {selectedGuide === 'gpay' && 'Google Pay Mandate Guide'}
                {selectedGuide === 'phonepe' && 'PhonePe AutoPay Guide'}
                {selectedGuide === 'netbanking' && 'Bank NetBanking e-Mandate Guide'}
              </h3>
              <button onClick={() => setSelectedGuide(null)} className="text-gray-400 hover:text-gray-900 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-3 leading-relaxed">
              {selectedGuide === 'gpay' && (
                <ol className="list-decimal list-inside space-y-2">
                  <li>Open <strong>Google Pay</strong> on your mobile phone.</li>
                  <li>Tap your <strong>Profile Photo</strong> in the top-right corner.</li>
                  <li>Tap <strong>Autopay</strong>.</li>
                  <li>Find the recurring merchant and select <strong>Cancel Autopay</strong> or <strong>Pause</strong>.</li>
                  <li>Enter your UPI PIN to authenticate the cancellation.</li>
                </ol>
              )}

              {selectedGuide === 'phonepe' && (
                <ol className="list-decimal list-inside space-y-2">
                  <li>Open <strong>PhonePe</strong> on your phone.</li>
                  <li>Tap your <strong>Profile Picture</strong> in the top-left corner.</li>
                  <li>Scroll to the <em>Payment Settings</em> section and tap <strong>Autopay Settings</strong>.</li>
                  <li>Select the active subscription mandate.</li>
                  <li>Tap <strong>Remove Autopay</strong> or <strong>Pause</strong> at the bottom.</li>
                </ol>
              )}

              {selectedGuide === 'netbanking' && (
                <ol className="list-decimal list-inside space-y-2">
                  <li>Log in to your bank's NetBanking portal (HDFC, ICICI, SBI, Axis).</li>
                  <li>Search for <strong>"e-Mandate"</strong> or <strong>"Standing Instructions"</strong>.</li>
                  <li>Select the merchant mandate you wish to revoke.</li>
                  <li>Click <strong>Revoke Mandate</strong> and verify with OTP.</li>
                </ol>
              )}
            </div>

            <button
              onClick={() => setSelectedGuide(null)}
              className="w-full bg-gray-900 text-white rounded-xl py-3 font-bold text-xs hover:bg-gray-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
