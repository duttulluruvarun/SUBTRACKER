import { useState } from 'react';
import { useAppStore, type Subscription } from '../../store/useAppStore';
import { 
  X, CreditCard, ShieldCheck, AlertTriangle, 
  Bell, PauseCircle, PlayCircle, Trash2, 
  Sparkles, Info, Check 
} from 'lucide-react';
import { clsx } from 'clsx';

interface ManageSubscriptionModalProps {
  subscription: Subscription | null;
  onClose: () => void;
  initialTab?: 'plan' | 'autopay' | 'svi' | 'cancel';
  onToast?: (message: string) => void;
}

export default function ManageSubscriptionModal({
  subscription,
  onClose,
  initialTab = 'plan',
  onToast
}: ManageSubscriptionModalProps) {
  const updateSubscription = useAppStore(state => state.updateSubscription);
  const removeSubscription = useAppStore(state => state.removeSubscription);

  const [modalTab, setModalTab] = useState<'plan' | 'autopay' | 'svi' | 'cancel'>(initialTab);

  const [editForm, setEditForm] = useState(() => ({
    name: subscription?.name || '',
    amount: subscription?.amount || 0,
    cycle: subscription?.cycle || 'Monthly',
    nextDue: subscription?.nextDue || '',
    category: subscription?.category || 'Streaming',
    isPaused: !!subscription?.isPaused,
    remindDaysBefore: subscription?.remindDaysBefore ?? 3,
    linkedMandate: subscription?.linkedMandate ?? 'HDFC UPI AutoPay',
    isZombie: !!subscription?.isZombie,
    svi: subscription?.svi || 'Good',
  }));

  if (!subscription) return null;

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

  const handleSave = () => {
    let updatedAction = 'Manage';
    if (editForm.isZombie) {
      updatedAction = 'Cancel ↗';
    } else if (editForm.cycle === 'Annual') {
      updatedAction = 'Review';
    }

    let updatedSvi = editForm.svi;
    if (editForm.isZombie && !updatedSvi.toLowerCase().includes('zombie')) {
      updatedSvi = '0 visits (Zombie)';
    } else if (!editForm.isZombie && updatedSvi.toLowerCase().includes('zombie')) {
      updatedSvi = 'Good (Active)';
    }

    updateSubscription(subscription.id, {
      name: editForm.name,
      amount: editForm.amount,
      cycle: editForm.cycle,
      nextDue: editForm.nextDue,
      category: editForm.category,
      isPaused: editForm.isPaused,
      remindDaysBefore: editForm.remindDaysBefore,
      linkedMandate: editForm.linkedMandate,
      isZombie: editForm.isZombie,
      svi: updatedSvi,
      action: updatedAction,
    });

    onToast?.(`Updated ${editForm.name} successfully!`);
    onClose();
  };

  const handleConfirmCancel = () => {
    const subName = subscription.name;
    removeSubscription(subscription.id);
    onToast?.(`${subName} cancelled & removed from active bills.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-[#ECECEE] my-6 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center space-x-4">
            <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-xs", subscription.iconColor)}>
              {subscription.iconInitial}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-extrabold text-gray-900">{editForm.name || subscription.name}</h3>
                {editForm.isPaused && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    PAUSED
                  </span>
                )}
                {editForm.isZombie && (
                  <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                    ZOMBIE
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                ₹{editForm.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} • {editForm.cycle} • {editForm.category}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-200/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs Navigation */}
        <div className="flex border-b border-gray-100 bg-white px-6 pt-2 space-x-2 overflow-x-auto text-xs font-bold text-gray-500 scrollbar-none">
          <button
            onClick={() => setModalTab('plan')}
            className={clsx(
              "pb-3 px-3 border-b-2 transition-colors whitespace-nowrap",
              modalTab === 'plan' 
                ? "border-[#D9222A] text-[#D9222A]" 
                : "border-transparent hover:text-gray-900"
            )}
          >
            Plan & Billing
          </button>
          <button
            onClick={() => setModalTab('autopay')}
            className={clsx(
              "pb-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center space-x-1.5",
              modalTab === 'autopay' 
                ? "border-[#D9222A] text-[#D9222A]" 
                : "border-transparent hover:text-gray-900"
            )}
          >
            <span>UPI AutoPay / e-Mandate</span>
            {editForm.isPaused && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
          </button>
          <button
            onClick={() => setModalTab('svi')}
            className={clsx(
              "pb-3 px-3 border-b-2 transition-colors whitespace-nowrap flex items-center space-x-1.5",
              modalTab === 'svi' 
                ? "border-[#D9222A] text-[#D9222A]" 
                : "border-transparent hover:text-gray-900"
            )}
          >
            <span>Usage & SVI</span>
            {editForm.isZombie && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
          </button>
          <button
            onClick={() => setModalTab('cancel')}
            className={clsx(
              "pb-3 px-3 border-b-2 transition-colors whitespace-nowrap text-red-600 hover:text-red-700",
              modalTab === 'cancel' 
                ? "border-red-600 font-extrabold" 
                : "border-transparent"
            )}
          >
            Cancel Subscription
          </button>
        </div>

        {/* Modal Body - Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* TAB 1: PLAN & BILLING */}
          {modalTab === 'plan' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-2xl text-xs text-blue-800 flex items-start space-x-2.5">
                <Info size={16} className="shrink-0 mt-0.5 text-blue-600" />
                <span>
                  Updating plan amount or billing cycle updates your monthly budget and recurring stats instantly.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Service Name
                </label>
                <input 
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Billing Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 font-bold text-gray-500 text-sm">₹</span>
                    <input 
                      type="number"
                      step="0.01"
                      value={editForm.amount}
                      onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 font-bold text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Billing Cycle
                  </label>
                  <select
                    value={editForm.cycle}
                    onChange={(e) => setEditForm({ ...editForm, cycle: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium text-gray-900 bg-white focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm cursor-pointer"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                    <option value="Weekly">Weekly</option>
                  </select>
                </div>
              </div>

              {/* Preset quick tier buttons for popular services */}
              {editForm.name.toLowerCase().includes('netflix') && (
                <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-600 mb-2">Popular Netflix Plans in India:</p>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[
                      { plan: 'Mobile', price: 149 },
                      { plan: 'Basic', price: 199 },
                      { plan: 'Standard', price: 499 },
                      { plan: 'Premium', price: 649 },
                    ].map((p) => (
                      <button
                        key={p.plan}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, amount: p.price, name: `Netflix ${p.plan}` })}
                        className={clsx(
                          "p-2 rounded-xl text-center font-bold border transition-all",
                          editForm.amount === p.price 
                            ? "bg-[#D9222A] text-white border-[#D9222A]" 
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div>{p.plan}</div>
                        <div className="text-[11px] opacity-90">₹{p.price}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium text-gray-900 bg-white focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm cursor-pointer"
                  >
                    <option value="Streaming">Streaming</option>
                    <option value="Health & Gym">Health & Gym</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Developer Tools">Developer Tools</option>
                    <option value="Music & Media">Music & Media</option>
                    <option value="Cloud Backup">Cloud Backup</option>
                    <option value="Creative Software">Creative Software</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Food & Groceries">Food & Groceries</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Next Renewal Date
                  </label>
                  <input 
                    type="text"
                    value={editForm.nextDue}
                    onChange={(e) => setEditForm({ ...editForm, nextDue: e.target.value })}
                    placeholder="e.g. Sep 22, 2026"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: UPI AUTOPAY & RBI MANDATE */}
          {modalTab === 'autopay' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-5 rounded-2xl shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <CreditCard size={18} className="text-red-400" />
                    <span className="text-xs font-bold tracking-wider uppercase text-gray-300">RBI e-Mandate Link</span>
                  </div>
                  <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-400/30 px-2 py-0.5 rounded-full font-bold">
                    Verified
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Linked Payment Channel</p>
                  <p className="text-sm font-bold text-white mt-0.5">{editForm.linkedMandate || 'HDFC UPI AutoPay'}</p>
                </div>
                <div className="text-[11px] text-gray-400 flex items-center space-x-2 pt-1 border-t border-gray-700/60">
                  <ShieldCheck size={14} className="text-green-400 shrink-0" />
                  <span>Protected under RBI Circular on Recurring E-Mandates (Max ₹15,000 w/o OTP)</span>
                </div>
              </div>

              {/* Pause AutoPay Toggle */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center space-x-2">
                    {editForm.isPaused ? (
                      <PauseCircle size={18} className="text-amber-600" />
                    ) : (
                      <PlayCircle size={18} className="text-green-600" />
                    )}
                    <span className="text-sm font-bold text-gray-900">
                      {editForm.isPaused ? 'AutoPay Currently Paused' : 'AutoPay is Active'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {editForm.isPaused 
                      ? 'Recurring charges are paused. This subscription is excluded from monthly recurring totals.' 
                      : 'Temporarily pause this recurring charge for 30 days without losing your account.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isPaused: !editForm.isPaused })}
                  className={clsx(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    editForm.isPaused ? "bg-amber-500" : "bg-gray-300"
                  )}
                >
                  <span
                    className={clsx(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      editForm.isPaused ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* 3-Day Pre-Debit Reminder */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell size={18} className="text-blue-600" />
                    <span className="text-sm font-bold text-gray-900">RBI Pre-Debit Notification Alert</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {editForm.remindDaysBefore} Days Prior
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Receive an alert {editForm.remindDaysBefore} days before your bank account is debited so you can review usage or revoke if unwanted.
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-xs text-gray-600 font-medium">Alert me:</span>
                  {[1, 2, 3, 5, 7].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, remindDaysBefore: days })}
                          className={clsx(
                            "px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                            editForm.remindDaysBefore === days 
                              ? "bg-gray-900 text-white" 
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          )}
                        >
                          {days}d
                        </button>
                  ))}
                </div>
              </div>

              {/* Edit Payment Mandate Source */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Linked Account / AutoPay Handle
                </label>
                <input 
                  type="text"
                  value={editForm.linkedMandate}
                  onChange={(e) => setEditForm({ ...editForm, linkedMandate: e.target.value })}
                  placeholder="e.g. HDFC UPI AutoPay (user@okhdfcbank)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* TAB 3: USAGE & SVI */}
          {modalTab === 'svi' && (
            <div className="space-y-5">
              {/* Current SVI Status */}
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subscription Value Index</span>
                  <span className={clsx(
                    "text-xs font-bold px-3 py-1 rounded-lg",
                    editForm.isZombie ? "bg-[#D9222A] text-white animate-pulse" : "bg-green-100 text-green-700"
                  )}>
                    {editForm.svi}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-white p-3 rounded-xl border border-gray-100">
                    <p className="text-[11px] text-gray-400 font-medium">Monthly Cost</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">
                      ₹{getMonthlyEquivalent({ amount: editForm.amount, cycle: editForm.cycle, isPaused: false }).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-100">
                    <p className="text-[11px] text-gray-400 font-medium">Annualized Cost</p>
                    <p className="text-lg font-bold text-gray-900 mt-0.5">
                      ₹{getAnnualCost({ amount: editForm.amount, cycle: editForm.cycle }).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Zombie Flag Toggle */}
              <div className={clsx(
                "p-4 rounded-2xl border transition-all flex items-center justify-between",
                editForm.isZombie ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-white"
              )}>
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle size={18} className={editForm.isZombie ? "text-[#D9222A]" : "text-gray-400"} />
                    <span className="text-sm font-bold text-gray-900">
                      {editForm.isZombie ? 'Flagged as Zombie / Unused Service' : 'Active & Essential Service'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {editForm.isZombie
                      ? 'This service is marked as unused. Its annual cost is added to your Potential Annual Savings metric.'
                      : 'Mark as Zombie if you rarely open or use this service to highlight money-saving opportunities.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isZombie: !editForm.isZombie })}
                  className={clsx(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    editForm.isZombie ? "bg-[#D9222A]" : "bg-gray-300"
                  )}
                >
                  <span
                    className={clsx(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      editForm.isZombie ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* SVI Metric Description Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Usage Note / SVI Label
                </label>
                <input 
                  type="text"
                  value={editForm.svi}
                  onChange={(e) => setEditForm({ ...editForm, svi: e.target.value })}
                  placeholder="e.g. High (42 hrs), 0 visits (Zombie), Good (14 orders)"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                />
              </div>
            </div>
          )}

          {/* TAB 4: CANCEL SUBSCRIPTION */}
          {modalTab === 'cancel' && (
            <div className="space-y-5">
              <div className="bg-red-50/80 border border-red-200 p-5 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-1">
                  <Trash2 size={24} />
                </div>
                <h4 className="text-lg font-bold text-gray-900">Cancel {subscription.name}?</h4>
                <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
                  You are currently paying ₹{subscription.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {subscription.cycle.toLowerCase()}. 
                  Cancelling will save you <strong className="text-green-700 font-bold">₹{getAnnualCost(subscription).toLocaleString('en-IN')}/yr</strong>.
                </p>
              </div>

              {/* Alternative to Cancellation */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2">
                <p className="text-xs font-bold text-amber-900 flex items-center space-x-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>Smart Alternative: Pause instead of cancel</span>
                </p>
                <p className="text-xs text-amber-700">
                  Don't want to lose your history, watchlist, or preferences? You can pause this subscription's auto-pay in the AutoPay tab for 30 days.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditForm({ ...editForm, isPaused: true });
                    setModalTab('autopay');
                  }}
                  className="text-xs font-bold text-amber-800 underline hover:text-amber-900"
                >
                  Switch to Pause AutoPay →
                </button>
              </div>

              {/* UPI AutoPay Cancellation Steps Guide */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-white space-y-3 text-xs text-gray-600">
                <p className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                  How to Revoke Mandate on Indian UPI Apps:
                </p>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li><strong>Google Pay:</strong> Tap profile picture &gt; Autopay &gt; Select {subscription.name} &gt; Cancel AutoPay.</li>
                  <li><strong>PhonePe:</strong> Tap profile picture &gt; Autopay Settings &gt; Select mandate &gt; Remove AutoPay.</li>
                  <li><strong>HDFC / ICICI NetBanking:</strong> Go to e-Mandate section &gt; Modify / Revoke Mandate.</li>
                </ul>
              </div>

              {/* Confirm Delete / Remove */}
              <div className="pt-2">
                <button 
                  type="button"
                  onClick={handleConfirmCancel}
                  className="w-full bg-[#D9222A] text-white rounded-xl py-3.5 font-bold hover:bg-[#B81B22] transition-colors shadow-sm flex items-center justify-center space-x-2"
                >
                  <Trash2 size={16} />
                  <span>Yes, Cancel & Remove Subscription</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors rounded-xl hover:bg-gray-200/50"
          >
            Close
          </button>

          <div className="flex items-center space-x-3">
            {modalTab !== 'cancel' && (
              <button 
                type="button"
                onClick={() => setModalTab('cancel')}
                className="px-4 py-2.5 text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
              >
                Cancel Plan
              </button>
            )}
            
            <button 
              type="button"
              onClick={handleSave}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <Check size={16} />
              <span>Save Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
