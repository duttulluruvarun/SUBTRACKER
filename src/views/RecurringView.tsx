import { useState, useMemo } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useAppStore, type Subscription } from '../store/useAppStore';
import ManageSubscriptionModal from '../components/subscription/ManageSubscriptionModal';
import { 
  Plus, X, PauseCircle, PlayCircle, 
  CheckCircle2
} from 'lucide-react';
import { clsx } from 'clsx';

export default function RecurringView() {
  const allSubscriptions = useAppStore(state => state.subscriptions);
  const addSubscription = useAppStore(state => state.addSubscription);
  const updateSubscription = useAppStore(state => state.updateSubscription);

  const [filterCycle, setFilterCycle] = useState('All');
  const [activeModalSub, setActiveModalSub] = useState<Subscription | null>(null);
  const [modalTab, setModalTab] = useState<'plan' | 'autopay' | 'svi' | 'cancel'>('plan');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [newSub, setNewSub] = useState({ 
    name: '', 
    amount: '', 
    category: 'Streaming', 
    cycle: 'Monthly', 
    nextDue: '',
    linkedMandate: 'HDFC UPI AutoPay'
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper to parse dates like "Sep 22, 2026" or "2026-09-22"
  const parseDueDate = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    const d2 = new Date(`${dateStr}, 2026`);
    if (!isNaN(d2.getTime())) return d2;
    return null;
  };

  // 1. Dynamic Total Monthly Recurring calculation
  const getMonthlyEquivalent = (sub: { amount: number; cycle: string; isPaused?: boolean }) => {
    if (sub.isPaused) return 0;
    if (sub.cycle === 'Annual') return sub.amount / 12;
    if (sub.cycle === 'Quarterly') return sub.amount / 3;
    if (sub.cycle === 'Weekly') return sub.amount * 4.33;
    return sub.amount;
  };

  const totalMonthlyRecurring = useMemo(() => {
    return allSubscriptions.reduce((acc, sub) => acc + getMonthlyEquivalent(sub), 0);
  }, [allSubscriptions]);

  const activeCount = useMemo(() => {
    return allSubscriptions.filter(s => !s.isPaused).length;
  }, [allSubscriptions]);

  const pausedCount = useMemo(() => {
    return allSubscriptions.filter(s => s.isPaused).length;
  }, [allSubscriptions]);

  // 2. Dynamic Upcoming in 7 Days calculation (reference date Sep 18, 2026)
  const baseToday = useMemo(() => new Date('2026-09-18T00:00:00'), []);
  const sevenDaysLater = useMemo(() => new Date(baseToday.getTime() + 7 * 24 * 60 * 60 * 1000), [baseToday]);

  const upcomingSubs = useMemo(() => {
    return allSubscriptions.filter(s => {
      if (s.isPaused) return false;
      const d = parseDueDate(s.nextDue);
      if (!d) return false;
      return d >= baseToday && d <= sevenDaysLater;
    });
  }, [allSubscriptions, baseToday, sevenDaysLater]);

  const upcomingTotal = useMemo(() => {
    return upcomingSubs.reduce((acc, s) => acc + s.amount, 0);
  }, [upcomingSubs]);

  // 3. Dynamic Potential Annual Savings (all zombie / unused subscriptions)
  const getAnnualCost = (sub: { amount: number; cycle: string }) => {
    if (sub.cycle === 'Annual') return sub.amount;
    if (sub.cycle === 'Quarterly') return sub.amount * 4;
    if (sub.cycle === 'Weekly') return sub.amount * 52;
    return sub.amount * 12;
  };

  const zombieSubs = useMemo(() => {
    return allSubscriptions.filter(s => s.isZombie);
  }, [allSubscriptions]);

  const potentialAnnualSavings = useMemo(() => {
    return zombieSubs.reduce((acc, s) => acc + getAnnualCost(s), 0);
  }, [zombieSubs]);

  // 4. Dynamic 14-Day Renewal Schedule
  const dynamicSchedule = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => {
      const dayDate = new Date(baseToday.getTime() + i * 24 * 60 * 60 * 1000);
      const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = dayDate.getDate();
      const label = `${dayName} ${dayNum}`;

      const matchedSubs = allSubscriptions.filter(s => {
        if (s.isPaused) return false;
        const d = parseDueDate(s.nextDue);
        if (!d) return false;
        return d.getDate() === dayNum && d.getMonth() === dayDate.getMonth();
      });

      let itemText: string | null = null;
      if (matchedSubs.length === 1) {
        itemText = `${matchedSubs[0].name.split(' ')[0]} (₹${matchedSubs[0].amount.toLocaleString('en-IN')})`;
      } else if (matchedSubs.length > 1) {
        itemText = `${matchedSubs[0].name.split(' ')[0]} +${matchedSubs.length - 1} more`;
      }

      return {
        day: label,
        item: itemText,
      };
    });
  }, [allSubscriptions, baseToday]);

  // Filtering
  const filteredSubscriptions = useMemo(() => {
    if (filterCycle === 'All') return allSubscriptions;
    if (filterCycle === 'Paused') return allSubscriptions.filter(s => s.isPaused);
    if (filterCycle === 'Zombies') return allSubscriptions.filter(s => s.isZombie);
    return allSubscriptions.filter(s => s.cycle === filterCycle);
  }, [allSubscriptions, filterCycle]);

  // Open modal with specific subscription
  const handleOpenManage = (sub: Subscription, initialTab: 'plan' | 'autopay' | 'svi' | 'cancel' = 'plan') => {
    setActiveModalSub(sub);
    setModalTab(initialTab);
  };

  const handleTogglePause = (sub: Subscription) => {
    const newPaused = !sub.isPaused;
    updateSubscription(sub.id, { isPaused: newPaused });
    showToast(newPaused ? `Paused ${sub.name} auto-deductions.` : `Resumed ${sub.name} subscription.`);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSub.name || !newSub.amount || !newSub.nextDue) return;
    
    addSubscription({
      id: `sub_${Date.now()}`,
      name: newSub.name,
      category: newSub.category,
      cycle: newSub.cycle,
      nextDue: newSub.nextDue,
      amount: parseFloat(newSub.amount),
      action: 'Manage',
      svi: 'High (New)',
      isZombie: false,
      iconInitial: newSub.name.charAt(0).toUpperCase(),
      iconColor: 'bg-emerald-100 text-emerald-600',
      isPaused: false,
      remindDaysBefore: 3,
      linkedMandate: newSub.linkedMandate,
    });
    
    setIsAddModalOpen(false);
    showToast(`Added ${newSub.name} to recurring subscriptions.`);
    setNewSub({ name: '', amount: '', category: 'Streaming', cycle: 'Monthly', nextDue: '', linkedMandate: 'HDFC UPI AutoPay' });
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
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Recurring Bills & Subscriptions</h1>
            <p className="text-[14px] md:text-[15px] text-gray-500 font-medium">Review active plans, upcoming renewal schedules, and contract optimization.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#D9222A] text-white px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-sm hover:bg-[#B81B22] transition-colors"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Add Recurring</span>
          </button>
        </div>

        {/* Dynamic Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm transition-all hover:shadow-md">
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-[13px] text-gray-500 font-medium">Total Monthly Recurring</h3>
               <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Auto-calculated</span>
             </div>
             <p className="text-3xl font-bold text-gray-900 mb-2">
               ₹{totalMonthlyRecurring.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
             <p className="text-[13px] text-gray-500 font-medium">
               {activeCount} active subscriptions {pausedCount > 0 && `(${pausedCount} paused)`}
             </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm transition-all hover:shadow-md">
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-[13px] text-gray-500 font-medium">Upcoming in 7 Days</h3>
               <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">Next 7 Days</span>
             </div>
             <p className="text-3xl font-bold text-[#D9222A] mb-2">
               ₹{upcomingTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
             <p className="text-[13px] text-gray-500 font-medium">
               {upcomingSubs.length} renewals imminent
             </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm transition-all hover:shadow-md">
             <div className="flex justify-between items-center mb-3">
               <h3 className="text-[13px] text-gray-500 font-medium">Potential Annual Savings</h3>
               <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Smart Alert</span>
             </div>
             <p className="text-3xl font-bold text-[#16A34A] mb-2">
               ₹{potentialAnnualSavings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </p>
             <p className="text-[13px] text-gray-500 font-medium">
               {zombieSubs.length} unused / zombie services detected
             </p>
          </div>
        </div>

        {/* Dynamic Renewal Schedule (Next 14 Days) */}
        <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm">
           <div className="flex justify-between items-center mb-6">
             <div>
               <h3 className="text-[15px] font-bold text-gray-900">Renewal Schedule (Next 14 Days)</h3>
               <p className="text-xs text-gray-400 font-medium mt-0.5">Timeline updates automatically as you manage plans</p>
             </div>
             <span className="text-xs text-gray-400 font-medium hidden sm:inline">Starting Sep 18, 2026</span>
           </div>
           
           <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-thin">
             {dynamicSchedule.map((item, index) => (
               <div key={index} className={clsx(
                 "flex-1 min-w-[110px] p-3 text-center rounded-xl border flex flex-col items-center justify-center min-h-[90px] transition-all",
                 item.item ? "border-red-200 bg-red-50/40 shadow-xs" : "border-gray-100 bg-gray-50/40"
               )}>
                 <p className="text-[12px] font-bold text-gray-700 mb-1.5">{item.day}</p>
                 {item.item ? (
                   <span className="text-[11px] font-bold text-[#D9222A] leading-tight line-clamp-2 px-1">
                     {item.item}
                   </span>
                 ) : (
                   <span className="text-[12px] text-gray-300 font-medium">—</span>
                 )}
               </div>
             ))}
           </div>
        </div>

        {/* Active Subscriptions Section */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 border border-[#ECECEE] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
             <div>
               <h3 className="text-lg sm:text-[17px] font-bold text-gray-900">Active Subscriptions</h3>
               <p className="text-xs text-gray-400 mt-0.5">Tap or click Manage on any subscription to adjust plan or AutoPay</p>
             </div>
             <div className="self-start sm:self-auto text-[13px] text-gray-600 font-medium flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
               <span className="text-gray-400">Filter:</span>
               <select 
                 value={filterCycle} 
                 onChange={(e) => setFilterCycle(e.target.value)}
                 className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
               >
                 <option value="All">All ({allSubscriptions.length})</option>
                 <option value="Monthly">Monthly</option>
                 <option value="Annual">Annual</option>
                 <option value="Paused">Paused ({pausedCount})</option>
                 <option value="Zombies">Zombies / Unused ({zombieSubs.length})</option>
               </select>
             </div>
          </div>

          {/* MOBILE VIEW: Clean, fully visible card rows (no horizontal cut-off) */}
          <div className="md:hidden space-y-3">
            {filteredSubscriptions.map((sub) => (
              <div 
                key={sub.id}
                className={clsx(
                  "p-4 rounded-2xl border transition-all space-y-3",
                  sub.isZombie 
                    ? "bg-red-50/30 border-red-200" 
                    : sub.isPaused 
                    ? "bg-amber-50/25 border-amber-200" 
                    : "bg-white border-gray-100 shadow-xs hover:border-gray-200"
                )}
              >
                {/* Top: Icon + Name & Mandate + Amount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs", sub.iconColor)}>
                      {sub.iconInitial}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <span className="text-[14px] font-bold text-gray-900 truncate">{sub.name}</span>
                        {sub.isPaused && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded">
                            PAUSED
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate max-w-[180px]">
                        {sub.linkedMandate || 'UPI AutoPay'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[15px] font-extrabold text-gray-900 tabular-nums">
                      ₹{sub.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-gray-400 font-medium">
                      {sub.cycle}
                    </div>
                  </div>
                </div>

                {/* Middle: Category, SVI metric badge, Next Due */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50 flex-wrap gap-2">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    <span className="bg-gray-100 text-gray-600 text-[11px] font-medium px-2.5 py-0.5 rounded-md">
                      {sub.category}
                    </span>
                    <span className={clsx(
                      "text-[11px] font-bold px-2 py-0.5 rounded-md",
                      sub.isZombie 
                        ? "bg-[#D9222A] text-white animate-pulse" 
                        : sub.isPaused 
                        ? "bg-amber-100 text-amber-700" 
                        : "bg-green-100 text-green-700"
                    )}>
                      {sub.isPaused ? 'AutoPay Paused' : sub.svi}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-500 font-medium">
                    Due: <span className="font-semibold text-gray-700">{sub.nextDue}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
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
                    {sub.isPaused ? <PlayCircle size={15} className="text-amber-600" /> : <PauseCircle size={15} className="text-gray-500" />}
                    <span>{sub.isPaused ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenManage(sub, sub.action.includes('Cancel') ? 'cancel' : 'plan')}
                    className={clsx(
                      "flex-[2] py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-xs text-center border",
                      sub.action.includes('Cancel')
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-gray-900 text-white border-transparent hover:bg-gray-800"
                    )}
                  >
                    {sub.action === 'Manage' ? 'Manage Plan' : sub.action}
                  </button>
                </div>
              </div>
            ))}

            {filteredSubscriptions.length === 0 && (
              <div className="text-center py-8 text-gray-400 font-medium text-sm">
                No subscriptions found under this filter.
              </div>
            )}
          </div>

          {/* DESKTOP VIEW: Full 7-column spreadsheet table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[2.2fr_1.3fr_1fr_1.2fr_1.2fr_1.4fr_1.3fr] gap-4 mb-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3">
                 <div>Merchant / Service</div>
                 <div className="text-center">Category</div>
                 <div>Cycle</div>
                 <div>Next Due</div>
                 <div className="text-right">Amount</div>
                 <div className="text-center text-brand-crimson">SVI Metric (Usage)</div>
                 <div className="text-center">Action</div>
              </div>
              
              <div className="space-y-1.5">
                 {filteredSubscriptions.map((sub) => (
                   <div key={sub.id} className={clsx(
                     "grid grid-cols-[2.2fr_1.3fr_1fr_1.2fr_1.2fr_1.4fr_1.3fr] gap-4 py-3.5 px-3 items-center rounded-xl transition-all border border-transparent",
                     sub.isZombie ? "bg-red-50/25 hover:border-red-100" : sub.isPaused ? "bg-amber-50/20 hover:border-amber-100 opacity-80" : "hover:bg-gray-50/80 hover:border-gray-100"
                   )}>
                      <div className="flex items-center space-x-3 min-w-0">
                         <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs", sub.iconColor)}>
                           {sub.iconInitial}
                         </div>
                         <div className="truncate min-w-0">
                           <div className="flex items-center space-x-2">
                             <span className="text-[14px] font-semibold text-gray-900 truncate">{sub.name}</span>
                             {sub.isPaused && (
                               <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                                 PAUSED
                               </span>
                             )}
                           </div>
                           <p className="text-[11px] text-gray-400 truncate">
                             {sub.linkedMandate || 'UPI AutoPay'}
                           </p>
                         </div>
                      </div>
                      
                      <div className="flex justify-center">
                        <span className="bg-gray-100 text-gray-600 text-[11px] font-medium px-3 py-1 rounded-md text-center truncate whitespace-nowrap">
                          {sub.category}
                        </span>
                      </div>

                      <div className="text-[13px] text-gray-500 font-medium whitespace-nowrap">
                        {sub.cycle}
                      </div>

                      <div className="text-[13px] text-gray-500 font-medium whitespace-nowrap">
                        {sub.nextDue}
                      </div>

                      <div className="text-[14px] font-bold text-gray-900 text-right tabular-nums whitespace-nowrap">
                        ₹{sub.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>

                      <div className="flex justify-center">
                        <span className={clsx(
                          "text-[11px] font-bold px-2.5 py-1 rounded-md text-center max-w-[140px] truncate whitespace-nowrap",
                          sub.isZombie 
                            ? "bg-[#D9222A] text-white animate-pulse" 
                            : sub.isPaused 
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        )}>
                          {sub.isPaused ? 'AutoPay Paused' : sub.svi}
                        </span>
                      </div>

                      <div className="flex items-center justify-center space-x-1.5">
                        <button 
                          onClick={() => handleTogglePause(sub)}
                          title={sub.isPaused ? "Resume subscription" : "Pause subscription"}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          {sub.isPaused ? (
                            <PlayCircle size={16} className="text-amber-600" />
                          ) : (
                            <PauseCircle size={16} className="text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                        
                        <button 
                          onClick={() => handleOpenManage(sub, sub.action.includes('Cancel') ? 'cancel' : 'plan')}
                          className={clsx(
                            "text-[12px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs whitespace-nowrap",
                            sub.action.includes('Cancel') 
                              ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/60" 
                              : "bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-200/60"
                          )}
                        >
                          {sub.action}
                        </button>
                      </div>
                   </div>
                 ))}
                 
                 {filteredSubscriptions.length === 0 && (
                   <div className="text-center py-12 text-gray-400 font-medium">
                     No subscriptions found under this filter.
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Comprehensive Manage Subscription Modal */}
      {activeModalSub && (
        <ManageSubscriptionModal
          subscription={activeModalSub}
          onClose={() => setActiveModalSub(null)}
          initialTab={modalTab}
          onToast={showToast}
        />
      )}

      {/* Add Subscription Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-[#ECECEE] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-extrabold text-gray-900">Add Recurring Bill</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Service Name</label>
                <input 
                  type="text" 
                  value={newSub.name}
                  onChange={e => setNewSub({...newSub, name: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                  placeholder="e.g. Disney+ Hotstar"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Amount (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={newSub.amount}
                    onChange={e => setNewSub({...newSub, amount: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-bold focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                    placeholder="299.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Billing Cycle</label>
                  <select 
                    value={newSub.cycle}
                    onChange={e => setNewSub({...newSub, cycle: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white font-medium focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm cursor-pointer"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Category</label>
                  <select 
                    value={newSub.category}
                    onChange={e => setNewSub({...newSub, category: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white font-medium focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm cursor-pointer"
                  >
                    <option value="Streaming">Streaming</option>
                    <option value="Health & Gym">Health & Gym</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Developer Tools">Developer Tools</option>
                    <option value="Music & Media">Music & Media</option>
                    <option value="Cloud Backup">Cloud Backup</option>
                    <option value="Creative Software">Creative Software</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Next Due Date</label>
                  <input 
                    type="text" 
                    value={newSub.nextDue}
                    onChange={e => setNewSub({...newSub, nextDue: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                    placeholder="e.g. Oct 15, 2026"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">AutoPay / Payment Method</label>
                <input 
                  type="text" 
                  value={newSub.linkedMandate}
                  onChange={e => setNewSub({...newSub, linkedMandate: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                  placeholder="e.g. HDFC UPI AutoPay"
                />
              </div>

              <div className="pt-3">
                <button 
                  type="submit"
                  className="w-full bg-[#D9222A] text-white rounded-xl py-3.5 font-bold hover:bg-[#B81B22] transition-colors shadow-sm"
                >
                  Save Subscription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
