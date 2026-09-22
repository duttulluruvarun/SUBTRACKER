import { useState, useMemo } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useAppStore } from '../store/useAppStore';
import { AreaChart, Area, XAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { clsx } from 'clsx';
import { 
  ChevronDown, ArrowDown, Building2, Utensils, 
  ShoppingBag, Car, Zap, Heart, Search, 
  Sparkles, AlertTriangle, ArrowUpRight, 
  TrendingDown, CheckCircle2, ChevronRight, X
} from 'lucide-react';

export default function SpendingView() {
  const envelopes = useAppStore(state => state.envelopes);
  const subscriptions = useAppStore(state => state.subscriptions);
  const transactions = useAppStore(state => state.transactions);
  const setCurrentView = useAppStore(state => state.setCurrentView);

  const [selectedMonth, setSelectedMonth] = useState('September 2026');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Icon mapping
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

  // Sync category data from store envelopes
  const categories = useMemo(() => {
    return envelopes.map(env => {
      const percent = env.allocated > 0 ? Math.round((env.spent / env.allocated) * 100) : 0;
      return {
        id: env.id,
        name: env.name,
        amount: env.spent,
        allocated: env.allocated,
        percent,
        color: env.color,
        icon: renderCategoryIcon(env.icon)
      };
    });
  }, [envelopes]);

  // Aggregate totals
  const totalSpent = useMemo(() => categories.reduce((sum, c) => sum + c.amount, 0), [categories]);
  const trackedDays = 18;
  const avgSpend = trackedDays > 0 ? Math.round(totalSpent / trackedDays) : 0;
  const projectedMonthEnd = Math.round(avgSpend * 30);

  // Filtered transactions for drill-down
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesCategory = !selectedCategory || tx.category === selectedCategory;
      const matchesSearch = !searchQuery || 
        tx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.channel && tx.channel.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tx.category && tx.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [transactions, selectedCategory, searchQuery]);

  // Chart data
  const chartData = useMemo(() => [
    { day: 'Day 1', current: 0, last: 0 },
    { day: 'Day 7', current: 12000, last: 14000 },
    { day: 'Day 15', current: 28000, last: 30000 },
    { day: 'Day 18', current: totalSpent, last: 33000 }, // Current day marker
    { day: 'Day 21', current: null, last: 37000 },
    { day: 'Day 30', current: null, last: 48000 },
  ], [totalSpent]);

  // Zombie subscriptions for insight synergy
  const zombieSubs = useMemo(() => subscriptions.filter(s => s.isZombie), [subscriptions]);
  const zombieOutflow = useMemo(() => {
    return zombieSubs.reduce((sum, s) => {
      if (s.cycle === 'Annual') return sum + s.amount / 12;
      if (s.cycle === 'Quarterly') return sum + s.amount / 3;
      return sum + s.amount;
    }, 0);
  }, [zombieSubs]);

  return (
    <div className="flex bg-[#F7F7F8] min-h-screen">
      <Sidebar />
      <main className="lg:ml-[240px] flex-1 p-4 pt-[72px] lg:pt-10 lg:p-10 pb-[100px] lg:pb-10 w-full max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Spending Breakdown</h1>
            <p className="text-[14px] md:text-[15px] text-gray-500 font-medium">
              Real-time transaction drill-down, daily acceleration curves, and AI anomaly alerts.
            </p>
          </div>
          
          <div className="relative">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-white border border-[#ECECEE] text-gray-700 px-4 py-2.5 pr-10 rounded-xl font-bold text-xs shadow-xs hover:bg-gray-50 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-[#D9222A]/20"
            >
              <option value="August 2026">August 2026</option>
              <option value="September 2026">September 2026 (Active)</option>
              <option value="October 2026">October 2026</option>
            </select>
            <ChevronDown size={15} className="text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm">
             <h3 className="text-[13px] text-gray-500 font-medium mb-3">Total Spent Month-to-Date</h3>
             <p className="text-3xl font-extrabold text-gray-900 mb-2 tabular-nums">
               ₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
             </p>
             <div className="flex items-center space-x-1 text-[#16A34A] text-[13px] font-bold">
               <ArrowDown size={14} />
               <span>₹1,420 less than this time last month</span>
             </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm">
             <h3 className="text-[13px] text-gray-500 font-medium mb-3">Daily Average Burn Rate</h3>
             <p className="text-3xl font-extrabold text-gray-900 mb-2 tabular-nums">
               ₹{avgSpend.toLocaleString('en-IN')}<span className="text-sm font-normal text-gray-400">/day</span>
             </p>
             <p className="text-[13px] text-gray-500 font-medium">{trackedDays} days tracked in September</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm">
             <h3 className="text-[13px] text-gray-500 font-medium mb-3">Projected Month-End Spend</h3>
             <p className="text-3xl font-extrabold text-gray-900 mb-2 tabular-nums">
               ₹{projectedMonthEnd.toLocaleString('en-IN')}
             </p>
             <p className="text-[13px] text-[#D9222A] font-bold flex items-center space-x-1">
               <ArrowUpRight size={14} />
               <span>Based on current burn acceleration</span>
             </p>
          </div>
        </div>

        {/* SMART SPENDING INSIGHTS & ANOMALY SPIKES RADAR */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECECEE] shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-gray-100">
            <span className="p-1.5 bg-red-100 text-[#D9222A] rounded-xl">
              <Sparkles size={18} />
            </span>
            <h3 className="text-base font-extrabold text-gray-900">Spending Intelligence & Anomaly Alerts</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Alert 1: Weekend Dining Spike */}
            <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-900 flex items-center space-x-1.5">
                  <Utensils size={14} className="text-orange-600" />
                  <span>Weekend Dining Surge</span>
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-200 text-orange-800">+32%</span>
              </div>
              <p className="text-xs text-orange-950/80 leading-relaxed">
                Swiggy & Zomato deliveries surged over the weekend (₹3,910 in 6 orders). Dining is consuming 84% of its envelope.
              </p>
            </div>

            {/* Alert 2: Zombie Outflow Warning */}
            <div className="p-4 rounded-2xl bg-red-50/50 border border-red-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-900 flex items-center space-x-1.5">
                  <AlertTriangle size={14} className="text-[#D9222A]" />
                  <span>Zombie Service Drain</span>
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-200 text-red-800">
                  ₹{Math.round(zombieOutflow).toLocaleString('en-IN')}/mo
                </span>
              </div>
              <p className="text-xs text-red-950/80 leading-relaxed">
                ₹{Math.round(zombieOutflow).toLocaleString('en-IN')} of your recurring spend is on low-usage apps (Adobe, Cult.fit). Pausing would save 18% of monthly cash.
              </p>
              <button
                onClick={() => setCurrentView('mandates')}
                className="text-xs font-bold text-[#D9222A] hover:underline flex items-center space-x-1 pt-0.5"
              >
                <span>Optimize in SVI Radar →</span>
              </button>
            </div>

            {/* Alert 3: Commute Drop */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                  <TrendingDown size={14} className="text-emerald-600" />
                  <span>Cab & Commute Drop</span>
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800">-₹1,420</span>
              </div>
              <p className="text-xs text-emerald-950/80 leading-relaxed">
                Uber and Ola rides are pacing 24% below ceiling this month, saving ₹1,420 compared to August.
              </p>
            </div>
          </div>
        </div>

        {/* 2-COLUMN SECTION: CUMULATIVE ACCELERATION CURVE & TOP CATEGORIES */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
          
          {/* Cumulative Spend Chart */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECECEE] shadow-sm">
             <div className="flex justify-between items-start mb-6">
               <div>
                 <h3 className="text-lg font-bold text-gray-900">Cumulative Cash Velocity Curve</h3>
                 <p className="text-[13px] text-gray-500 font-medium mt-0.5">Day-by-day spend acceleration vs. last month</p>
               </div>
               <div className="flex items-center space-x-4 text-xs font-bold text-gray-500">
                 <div className="flex items-center space-x-1.5">
                   <div className="w-4 h-1 bg-[#3B82F6] rounded-full"></div>
                   <span>September</span>
                 </div>
                 <div className="flex items-center space-x-1.5">
                   <div className="w-4 h-0.5 border-t-2 border-dashed border-gray-300"></div>
                   <span>August</span>
                 </div>
               </div>
             </div>

             <div className="h-[290px] w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <ReferenceLine y={45000} stroke="#EF4444" strokeDasharray="3 3" />
                  
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                    dy={10}
                  />
                  
                  <Area 
                    type="monotone" 
                    dataKey="last" 
                    stroke="#D1D5DB" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    fill="transparent" 
                    activeDot={false}
                  />

                  <Area 
                    type="monotone" 
                    dataKey="current" 
                    stroke="#3B82F6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#spendGradient)"
                    activeDot={{ r: 5, fill: '#fff', stroke: '#3B82F6', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute right-2 top-2 text-[10px] text-red-500 font-bold uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded">
                Ceiling ₹45,000
              </div>
             </div>
          </div>

          {/* Interactive Category Selector */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECECEE] shadow-sm flex flex-col justify-between">
             <div className="space-y-1 mb-5">
               <div className="flex justify-between items-center">
                 <h3 className="text-lg font-bold text-gray-900">Spending by Category</h3>
                 {selectedCategory && (
                   <button
                     onClick={() => setSelectedCategory(null)}
                     className="text-xs font-bold text-[#D9222A] hover:underline flex items-center space-x-1"
                   >
                     <X size={12} />
                     <span>Clear Filter</span>
                   </button>
                 )}
               </div>
               <p className="text-xs text-gray-400">
                 Tap any category to filter and inspect itemized transactions below
               </p>
             </div>

             <div className="space-y-3 flex-1">
               {categories.map((cat) => {
                 const isSelected = selectedCategory === cat.name;
                 return (
                   <div 
                     key={cat.id} 
                     onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                     className={clsx(
                       "p-3 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3.5",
                       isSelected 
                         ? "border-gray-900 bg-gray-50/90 shadow-xs" 
                         : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/50"
                     )}
                   >
                      <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs", cat.color)}>
                        {cat.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className={clsx("text-xs font-bold truncate", isSelected ? "text-gray-950" : "text-gray-800")}>
                            {cat.name}
                          </span>
                          <span className="text-xs font-bold text-gray-900 tabular-nums">
                            ₹{cat.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                          <div className={clsx("h-full rounded-full", cat.color)} style={{ width: `${Math.min(100, cat.percent)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-medium mt-1">
                          <span>{cat.percent}% used</span>
                          <span>of ₹{cat.allocated.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <ChevronRight size={15} className={clsx("text-gray-300 transition-transform shrink-0", isSelected && "rotate-90 text-gray-900")} />
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        {/* INTERACTIVE TRANSACTION DRILL-DOWN SECTION */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#ECECEE] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedCategory ? `${selectedCategory} Transactions` : 'All Itemized Transactions'}
                </h3>
                <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                  {filteredTransactions.length} items
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Detailed transaction log with payment channels and verification timestamps
              </p>
            </div>

            {/* Keyword Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={15} className="text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Swiggy, Netflix, Uber..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-[#D9222A] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Transactions Table / List */}
          <div className="divide-y divide-gray-100">
            {filteredTransactions.map(tx => (
              <div key={tx.id || tx.name} className="py-3.5 flex items-center justify-between hover:bg-gray-50/60 px-2 rounded-xl transition-colors">
                <div className="flex items-center space-x-3.5 min-w-0 pr-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {tx.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{tx.name}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span className="text-gray-600 font-medium">{tx.channel || 'UPI'}</span>
                      {tx.category && (
                        <>
                          <span>•</span>
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-medium">
                            {tx.category.split(' ')[0]}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-gray-900 tabular-nums">
                    ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center justify-end space-x-1 text-[10px] font-bold text-emerald-600 mt-0.5">
                    <CheckCircle2 size={11} />
                    <span>Cleared</span>
                  </div>
                </div>
              </div>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="text-center py-10 text-gray-400 font-medium text-xs">
                No transactions matched your search or category filter.
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
