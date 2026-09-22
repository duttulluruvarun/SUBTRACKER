import { useState, useMemo } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useAppStore, type BudgetEnvelope, type SavingsGoal } from '../store/useAppStore';
import { 
  Building2, Utensils, Zap, ShoppingBag, Car, Heart, 
  Sparkles, Flame, Plus, CheckCircle2, AlertTriangle, 
  Target, X, ChevronDown, 
  PiggyBank, Edit3
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';

export default function BudgetView() {
  const envelopes = useAppStore(state => state.envelopes);
  const savingsGoals = useAppStore(state => state.savingsGoals);
  const subscriptions = useAppStore(state => state.subscriptions);
  const updateEnvelope = useAppStore(state => state.updateEnvelope);
  const addEnvelope = useAppStore(state => state.addEnvelope);
  const addSavingsGoal = useAppStore(state => state.addSavingsGoal);
  const depositToGoal = useAppStore(state => state.depositToGoal);
  const reallocateZombieSavings = useAppStore(state => state.reallocateZombieSavings);

  const [selectedMonth, setSelectedMonth] = useState('September 2026');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [editingEnvelope, setEditingEnvelope] = useState<BudgetEnvelope | null>(null);
  const [isAddEnvelopeOpen, setIsAddEnvelopeOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('1000');
  const [isCreateGoalOpen, setIsCreateGoalOpen] = useState(false);
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);

  // Forms state
  const [newEnvForm, setNewEnvForm] = useState({ name: '', allocated: '', icon: 'ShoppingBag', color: 'bg-indigo-500' });
  const [newGoalForm, setNewGoalForm] = useState({ name: '', target: '', category: 'Travel', icon: '🎯', deadline: 'Dec 2026' });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to render icon component based on name
  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building2': return <Building2 size={18} />;
      case 'Utensils': return <Utensils size={18} />;
      case 'Zap': return <Zap size={18} />;
      case 'ShoppingBag': return <ShoppingBag size={18} />;
      case 'Car': return <Car size={18} />;
      case 'Heart': return <Heart size={18} />;
      default: return <ShoppingBag size={18} />;
    }
  };

  // Days calculations for September 2026 (Day 18 of 30)
  const daysInMonth = 30;
  const daysElapsed = 18;
  const daysRemaining = daysInMonth - daysElapsed;
  const elapsedPercent = Math.round((daysElapsed / daysInMonth) * 100); // 60%

  // Aggregate totals
  const totalAllocated = useMemo(() => envelopes.reduce((acc, e) => acc + e.allocated, 0), [envelopes]);
  const totalSpent = useMemo(() => envelopes.reduce((acc, e) => acc + e.spent, 0), [envelopes]);
  const totalRemaining = totalAllocated - totalSpent;
  const dailySafeToSpend = daysRemaining > 0 ? Math.max(0, Math.round(totalRemaining / daysRemaining)) : 0;
  const overallBurnPercent = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  // Paused / Zombie Subscriptions Savings (Synergy with SVI Radar)
  const pausedSubs = useMemo(() => subscriptions.filter(s => s.isPaused), [subscriptions]);
  const pausedMonthlySavings = useMemo(() => {
    return pausedSubs.reduce((sum, s) => {
      if (s.cycle === 'Annual') return sum + s.amount / 12;
      if (s.cycle === 'Quarterly') return sum + s.amount / 3;
      return sum + s.amount;
    }, 0);
  }, [pausedSubs]);

  // Pie chart data
  const pieData = useMemo(() => [
    { name: 'Spent', value: totalSpent, color: '#D9222A' },
    { name: 'Safe to Spend', value: Math.max(0, totalRemaining), color: '#16A34A' }
  ], [totalSpent, totalRemaining]);

  // Handlers
  const handleSaveEnvelopeLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnvelope) return;
    updateEnvelope(editingEnvelope.id, editingEnvelope.allocated);
    showToast(`Updated ${editingEnvelope.name} limit to ₹${editingEnvelope.allocated.toLocaleString('en-IN')}`);
    setEditingEnvelope(null);
  };

  const handleCreateEnvelope = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvForm.name || !newEnvForm.allocated) return;
    addEnvelope({
      id: `env_${Date.now()}`,
      name: newEnvForm.name,
      allocated: parseFloat(newEnvForm.allocated) || 0,
      spent: 0,
      icon: newEnvForm.icon,
      color: newEnvForm.color
    });
    showToast(`Added envelope: ${newEnvForm.name}`);
    setIsAddEnvelopeOpen(false);
    setNewEnvForm({ name: '', allocated: '', icon: 'ShoppingBag', color: 'bg-indigo-500' });
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalForm.name || !newGoalForm.target) return;
    addSavingsGoal({
      id: `goal_${Date.now()}`,
      name: newGoalForm.name,
      target: parseFloat(newGoalForm.target) || 0,
      current: 0,
      category: newGoalForm.category,
      icon: newGoalForm.icon || '🎯',
      deadline: newGoalForm.deadline || 'Dec 2026'
    });
    showToast(`Created savings goal: ${newGoalForm.name}`);
    setIsCreateGoalOpen(false);
    setNewGoalForm({ name: '', target: '', category: 'Travel', icon: '🎯', deadline: 'Dec 2026' });
  };

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForDeposit) return;
    const amount = parseFloat(depositAmount) || 0;
    if (amount <= 0) return;
    depositToGoal(selectedGoalForDeposit.id, amount);
    showToast(`Deposited ₹${amount.toLocaleString('en-IN')} into ${selectedGoalForDeposit.name}!`);
    setIsDepositModalOpen(false);
  };

  const handleConfirmReallocate = (goalId: string) => {
    reallocateZombieSavings(goalId, pausedMonthlySavings);
    const targetGoal = savingsGoals.find(g => g.id === goalId);
    showToast(`Transferred ₹${pausedMonthlySavings.toLocaleString('en-IN')} from paused subscriptions to ${targetGoal?.name || 'goal'}!`);
    setIsReallocateModalOpen(false);
  };

  return (
    <div className="flex bg-[#F7F7F8] min-h-screen">
      <Sidebar />
      <main className="lg:ml-[240px] flex-1 p-4 pt-[72px] lg:pt-10 lg:p-10 pb-[100px] lg:pb-10 w-full max-w-7xl mx-auto space-y-8">

        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-[100] bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-semibold border border-gray-700 animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={18} className="text-green-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header & Month Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <span className="p-1.5 bg-red-100 text-[#D9222A] rounded-xl">
                <Target size={22} />
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                Smart Budget Command
              </h1>
            </div>
            <p className="text-[14px] md:text-[15px] text-gray-500 font-medium">
              Category envelope budgeting, burn velocity alerts, and automated savings goals.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-white border border-[#ECECEE] text-gray-700 px-4 py-2.5 pr-9 rounded-xl font-bold text-xs shadow-xs hover:bg-gray-50 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-[#D9222A]/20"
              >
                <option value="August 2026">August 2026</option>
                <option value="September 2026">September 2026 (Active)</option>
                <option value="October 2026">October 2026</option>
              </select>
              <ChevronDown size={14} className="text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              onClick={() => setIsAddEnvelopeOpen(true)}
              className="bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold flex items-center space-x-1.5 shadow-xs hover:bg-gray-800 transition-colors text-xs"
            >
              <Plus size={15} />
              <span>Add Category</span>
            </button>
          </div>
        </div>

        {/* ZOMBIE SAVINGS REALLOCATION BANNER (Synergy with SVI Radar) */}
        {pausedMonthlySavings > 0 ? (
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-gray-900 text-white rounded-3xl p-6 shadow-sm border border-emerald-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
            <div className="space-y-1.5 relative z-10">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
                  <Flame size={16} />
                </span>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  SVI Radar Synergy • Unlocked Cashflow
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-white">
                ₹{pausedMonthlySavings.toLocaleString('en-IN')}/mo Unlocked from Paused AutoPay
              </h3>
              <p className="text-xs text-emerald-100/80 max-w-xl leading-relaxed">
                You successfully paused <strong>{pausedSubs.map(s => s.name).join(', ')}</strong>. This money is no longer drained automatically. Reallocate it to accelerate your Sinking Funds!
              </p>
            </div>

            <button
              onClick={() => setIsReallocateModalOpen(true)}
              className="bg-emerald-400 text-gray-950 px-5 py-3 rounded-2xl font-bold text-xs hover:bg-emerald-300 transition-all shadow-md flex items-center space-x-2 shrink-0"
            >
              <Sparkles size={16} className="text-gray-950" />
              <span>Reallocate to Goals ⚡</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-5 border border-[#ECECEE] shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                <Sparkles size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Want to unlock extra monthly budget?</h4>
                <p className="text-[11px] text-gray-500">
                  Check SVI Radar to pause unused subscriptions and reallocate freed cash into your savings goals.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-gray-400">All Mandates Active</span>
          </div>
        )}

        {/* TOP SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-[#ECECEE] shadow-xs">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Monthly Budget</p>
            <p className="text-2xl font-extrabold text-gray-900 tabular-nums">
              ₹{totalAllocated.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">{envelopes.length} active categories</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#ECECEE] shadow-xs">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Spent Month-to-Date</p>
            <p className="text-2xl font-extrabold text-[#D9222A] tabular-nums">
              ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">{overallBurnPercent}% of total budget used</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#ECECEE] shadow-xs">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Remaining Safe-to-Spend</p>
            <p className={clsx("text-2xl font-extrabold tabular-nums", totalRemaining >= 0 ? "text-green-600" : "text-red-600")}>
              ₹{Math.max(0, totalRemaining).toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-gray-500 mt-1 font-medium">₹{dailySafeToSpend}/day for next {daysRemaining} days</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-[#ECECEE] shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Spend Velocity Status</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                {overallBurnPercent > elapsedPercent + 10 ? (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md flex items-center space-x-1">
                    <AlertTriangle size={12} />
                    <span>Pacing 1.2x Fast</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md flex items-center space-x-1">
                    <CheckCircle2 size={12} />
                    <span>Pacing Healthy</span>
                  </span>
                )}
              </div>
            </div>
            <p className="text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-100">
              {daysElapsed} of {daysInMonth} days elapsed ({elapsedPercent}%)
            </p>
          </div>
        </div>

        {/* MAIN 2-COLUMN LAYOUT: CATEGORY ENVELOPES & SINKING FUNDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLS: CATEGORY ENVELOPES & VELOCITY ALERTS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECECEE] shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">Category Envelopes</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Real-time burn meters and velocity alerts against month-to-date pace
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 self-start sm:self-auto">
                  {daysRemaining} Days Left in Cycle
                </span>
              </div>

              {/* Envelope List */}
              <div className="space-y-4">
                {envelopes.map(env => {
                  const percentUsed = env.allocated > 0 ? Math.round((env.spent / env.allocated) * 100) : 0;
                  const isOverBudget = env.spent > env.allocated;
                  const isPacingFast = percentUsed > elapsedPercent + 10 && !isOverBudget;
                  const remainingInEnv = env.allocated - env.spent;

                  return (
                    <div 
                      key={env.id}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all space-y-3",
                        isOverBudget 
                          ? "bg-red-50/30 border-red-200" 
                          : isPacingFast 
                          ? "bg-amber-50/20 border-amber-200/80" 
                          : "bg-gray-50/50 border-gray-200/60 hover:border-gray-300"
                      )}
                    >
                      {/* Top row: Icon + Name + Amount */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0 pr-2">
                          <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs", env.color)}>
                            {renderCategoryIcon(env.icon)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-gray-900 text-sm truncate">{env.name}</h4>
                              {isOverBudget ? (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                  OVER LIMIT
                                </span>
                              ) : isPacingFast ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  PACING FAST
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                                  ON TRACK
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Spent ₹{env.spent.toLocaleString('en-IN', { minimumFractionDigits: 0 })} of ₹{env.allocated.toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>

                        {/* Right: Remaining Amount & Edit Button */}
                        <div className="flex items-center space-x-3 shrink-0">
                          <div className="text-right">
                            <span className={clsx("text-sm font-extrabold tabular-nums", isOverBudget ? "text-[#D9222A]" : "text-gray-900")}>
                              {remainingInEnv >= 0 ? `₹${remainingInEnv.toLocaleString('en-IN')}` : `-₹${Math.abs(remainingInEnv).toLocaleString('en-IN')}`}
                            </span>
                            <p className="text-[10px] text-gray-400 font-medium">
                              {remainingInEnv >= 0 ? 'Remaining' : 'Overspent'}
                            </p>
                          </div>

                          <button
                            onClick={() => setEditingEnvelope(env)}
                            title="Edit envelope limit"
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full h-2.5 bg-gray-200/70 rounded-full overflow-hidden flex">
                          <div 
                            style={{ width: `${Math.min(100, percentUsed)}%` }}
                            className={clsx(
                              "h-full rounded-full transition-all duration-500",
                              isOverBudget 
                                ? "bg-[#D9222A]" 
                                : isPacingFast 
                                ? "bg-amber-500" 
                                : "bg-emerald-500"
                            )}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                          <span>{percentUsed}% burned</span>
                          <span>{isOverBudget ? 'Exceeded by ₹' + (env.spent - env.allocated).toLocaleString('en-IN') : `₹${Math.round(remainingInEnv / (daysRemaining || 1))}/day safe pace`}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 1 COL: GOAL-BASED SINKING FUNDS & DISTRIBUTION */}
          <div className="space-y-6">
            
            {/* Sinking Funds / Mini Goals Card */}
            <div className="bg-white rounded-3xl p-6 md:p-7 border border-[#ECECEE] shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <PiggyBank size={20} className="text-[#D9222A]" />
                  <h3 className="text-base font-extrabold text-gray-900">Sinking Funds</h3>
                </div>
                <button
                  onClick={() => setIsCreateGoalOpen(true)}
                  className="text-xs font-bold text-[#D9222A] hover:text-[#B81B22] flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>New Goal</span>
                </button>
              </div>

              <div className="space-y-4">
                {savingsGoals.map(goal => {
                  const progress = Math.min(100, Math.round((goal.current / goal.target) * 100));
                  return (
                    <div key={goal.id} className="p-4 rounded-2xl bg-gray-50/70 border border-gray-200/70 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-xl p-1.5 bg-white rounded-xl shadow-xs border border-gray-100">
                            {goal.icon}
                          </span>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{goal.name}</h4>
                            <p className="text-[10px] text-gray-400 font-medium">{goal.deadline || 'Ongoing'}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedGoalForDeposit(goal);
                            setIsDepositModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-1 shadow-xs"
                        >
                          <Plus size={12} />
                          <span>Deposit</span>
                        </button>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-gray-900 tabular-nums">
                            ₹{goal.current.toLocaleString('en-IN')}
                          </span>
                          <span className="text-gray-400 tabular-nums">
                            ₹{goal.target.toLocaleString('en-IN')} ({progress}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${progress}%` }}
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Distribution Pie Chart */}
            <div className="bg-white rounded-3xl p-6 border border-[#ECECEE] shadow-sm space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Current Spend vs Left to Spend
              </h4>

              <div className="relative w-40 h-40 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={68}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Left</span>
                  <span className="text-sm font-extrabold text-green-700">
                    ₹{Math.max(0, totalRemaining).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D9222A]"></span>
                    <span>Total Spent</span>
                  </span>
                  <span className="font-bold text-gray-900 tabular-nums">₹{totalSpent.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]"></span>
                    <span>Remaining Allowance</span>
                  </span>
                  <span className="font-bold text-gray-900 tabular-nums">₹{Math.max(0, totalRemaining).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* EDIT ENVELOPE MODAL */}
      {editingEnvelope && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Adjust Envelope Limit</h3>
              <button onClick={() => setEditingEnvelope(null)} className="text-gray-400 hover:text-gray-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEnvelopeLimit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  {editingEnvelope.name} Limit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    step="100"
                    value={editingEnvelope.allocated}
                    onChange={(e) => setEditingEnvelope({ ...editingEnvelope, allocated: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 font-bold text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEnvelope(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 shadow-sm"
                >
                  Save Limit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW ENVELOPE MODAL */}
      {isAddEnvelopeOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Add Budget Category</h3>
              <button onClick={() => setIsAddEnvelopeOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEnvelope} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Travel, Electronics"
                  value={newEnvForm.name}
                  onChange={(e) => setNewEnvForm({ ...newEnvForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium text-sm text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Monthly Limit (₹)</label>
                <input
                  type="number"
                  placeholder="5000"
                  value={newEnvForm.allocated}
                  onChange={(e) => setNewEnvForm({ ...newEnvForm, allocated: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-sm text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none"
                  required
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEnvelopeOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 shadow-sm"
                >
                  Create Envelope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SINKING FUND / GOAL MODAL */}
      {isCreateGoalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">New Sinking Fund Goal</h3>
              <button onClick={() => setIsCreateGoalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Goal Name</label>
                <input
                  type="text"
                  placeholder="e.g. Europe Trip, Car Downpayment"
                  value={newGoalForm.name}
                  onChange={(e) => setNewGoalForm({ ...newGoalForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-medium text-sm text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Target Amount (₹)</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={newGoalForm.target}
                  onChange={(e) => setNewGoalForm({ ...newGoalForm, target: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-sm text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Icon Emoji</label>
                  <input
                    type="text"
                    value={newGoalForm.icon}
                    onChange={(e) => setNewGoalForm({ ...newGoalForm, icon: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2 text-center text-lg focus:ring-2 focus:ring-[#D9222A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Target Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Dec 2026"
                    value={newGoalForm.deadline}
                    onChange={(e) => setNewGoalForm({ ...newGoalForm, deadline: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#D9222A] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateGoalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 shadow-sm"
                >
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK DEPOSIT TO GOAL MODAL */}
      {isDepositModalOpen && selectedGoalForDeposit && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{selectedGoalForDeposit.icon}</span>
                <h3 className="text-base font-bold text-gray-900">Deposit to {selectedGoalForDeposit.name}</h3>
              </div>
              <button onClick={() => setIsDepositModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Select Amount (₹)</label>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold mb-3">
                  {['500', '1000', '2500'].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt)}
                      className={clsx(
                        "py-2 rounded-xl border transition-all",
                        depositAmount === amt 
                          ? "bg-gray-900 text-white border-gray-900" 
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-gray-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    step="50"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 font-bold text-gray-900 focus:ring-2 focus:ring-[#D9222A] focus:border-[#D9222A] outline-none text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REALLOCATE ZOMBIE SAVINGS MODAL */}
      {isReallocateModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2 text-emerald-700">
                <Sparkles size={18} />
                <h3 className="text-base font-bold text-gray-900">Reallocate Unlocked Savings</h3>
              </div>
              <button onClick={() => setIsReallocateModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold">Available Unlocked Cashflow: ₹{pausedMonthlySavings.toLocaleString('en-IN')}/mo</p>
              <p className="text-[11px] text-emerald-700">
                Saved from paused subscriptions ({pausedSubs.map(s => s.name).join(', ')}). Select which Sinking Fund to fund with this amount:
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {savingsGoals.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => handleConfirmReallocate(goal.id)}
                  className="w-full p-3 rounded-2xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-center justify-between text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{goal.icon}</span>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm group-hover:text-emerald-900">{goal.name}</h4>
                      <p className="text-[11px] text-gray-500">Currently ₹{goal.current.toLocaleString('en-IN')} of ₹{goal.target.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-xl">
                    +₹{pausedMonthlySavings.toLocaleString('en-IN')}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsReallocateModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
