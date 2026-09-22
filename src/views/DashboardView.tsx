import Sidebar from '../components/layout/Sidebar';
import { useAppStore } from '../store/useAppStore';
import { Area, AreaChart, ResponsiveContainer, XAxis, ReferenceLine, CartesianGrid } from 'recharts';
import { ArrowUpRight, ChevronRight, Info, Building2, Store, ShoppingBag, Utensils, RefreshCcw, CreditCard, ShieldCheck, Clock, LineChart } from 'lucide-react';
import { clsx } from 'clsx';
import Papa from 'papaparse';
import { useRef, useEffect } from 'react';

const chartData = [
  { day: '1st', value: 0 },
  { day: '7th', value: 372 },
  { day: '15th', value: 743 },
  { day: '21st', value: 1110 },
  { day: '30th', value: 1486 },
];

export default function DashboardView() {
  const userName = useAppStore(state => state.userName);
  const subscriptions = useAppStore(state => state.subscriptions);
  const setCurrentView = useAppStore(state => state.setCurrentView);
  const transactions = useAppStore(state => state.transactions);
  const addTransactions = useAppStore(state => state.addTransactions);
  const isUsagePermissionGranted = useAppStore(state => state.isUsagePermissionGranted);
  const appUsageData = useAppStore(state => state.appUsageData);
  const checkUsagePermission = useAppStore(state => state.checkUsagePermission);
  const requestUsagePermission = useAppStore(state => state.requestUsagePermission);
  const fetchAppUsage = useAppStore(state => state.fetchAppUsage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkUsagePermission();
    const handleResume = () => {
      checkUsagePermission();
      fetchAppUsage();
    };
    window.addEventListener('focus', handleResume);
    document.addEventListener('visibilitychange', handleResume);
    return () => {
      window.removeEventListener('focus', handleResume);
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, [checkUsagePermission, fetchAppUsage]);

  useEffect(() => {
    if (isUsagePermissionGranted) {
      fetchAppUsage();
    }
  }, [isUsagePermissionGranted, fetchAppUsage]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Assume simple CSV format: Date, Description, Amount
        const parsedTxs = results.data.map((row: any) => {
          const date = row.Date || new Date().toLocaleDateString('en-IN', { month: 'numeric', day: 'numeric' });
          const name = row.Description || row.Narration || row.Particulars || row['Transaction Remarks'] || 'Unknown Transaction';
          const amountStr = String(row.Amount || row.Withdrawal || row.Debit || row['Withdrawal Amt.'] || '0').replace(/[^0-9.-]+/g,"");
          const amount = parseFloat(amountStr) || 0;
          return { date, name, status: 'completed' as const, amount: Math.abs(amount) };
        });
        if (parsedTxs.length > 0) {
          addTransactions(parsedTxs);
        }
      }
    });
  };

  const getIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('zomato') || n.includes('swiggy')) return <Utensils size={14} />;
    if (n.includes('netflix') || n.includes('gym')) return <ShoppingBag size={14} />;
    if (n.includes('rent')) return <Building2 size={14} />;
    return <Store size={14} />;
  };

  return (
    <div className="flex bg-surface-gray min-h-screen">
      <Sidebar />
      <main className="lg:ml-[240px] flex-1 p-4 pt-[72px] lg:pt-10 lg:p-10 pb-[100px] lg:pb-10 w-full max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="space-y-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-8">Good afternoon, {userName}</h1>
          
          {/* Main Spend Chart Card */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#ECECEE]">
            <div className="flex justify-between items-start mb-10">
              <div>
                <p className="text-[13px] text-gray-500 font-medium mb-1 uppercase tracking-wider">Current spend this month</p>
                <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">₹1,486</h2>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <div className="bg-orange-500 text-white rounded-full p-0.5"><ArrowUpRight size={12} strokeWidth={3} /></div>
                <span className="text-xs font-medium text-gray-600">You've spent ₹1,393 more<br/>than last month</span>
              </div>
            </div>
            
            <div className="h-64 w-full relative">
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <ReferenceLine y={1490} stroke="#E5E7EB" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorValue)"
                    activeDot={{ r: 6, fill: '#3B82F6', stroke: '#fff', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              {/* End dot manual placement for visual clone exactness */}
              <div className="absolute right-[30px] top-[10px] w-4 h-4 bg-white border-4 border-chart-blue rounded-full shadow-sm z-10"></div>
            </div>
          </div>

          {/* Subscription Value Index (SVI) Card */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#ECECEE]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">Subscription Value Index (SVI)</h3>
                <p className="text-xs text-gray-400 mt-0.5">Live OS Screen-Time Telemetry</p>
              </div>
              <div className="flex items-center space-x-2">
                {isUsagePermissionGranted && (
                  <button 
                    onClick={() => fetchAppUsage()}
                    className="flex items-center space-x-1 text-xs font-bold text-[#D9222A] bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
                    title="Sync Telemetry"
                  >
                    <RefreshCcw size={12} />
                    <span>Sync Live Usage</span>
                  </button>
                )}
                <Info size={16} className="text-gray-400" />
              </div>
            </div>

            {!isUsagePermissionGranted ? (
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col items-center text-center">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600 mb-4"><LineChart size={24} /></div>
                <h4 className="text-gray-900 font-bold mb-2">Enable SVI Tracking</h4>
                <p className="text-sm text-gray-600 mb-6">Connect your phone's screen time securely to calculate exactly how much value you get from Netflix, YouTube, Spotify, and more.</p>
                <button 
                  onClick={requestUsagePermission}
                  className="bg-[#D9222A] text-white font-bold py-3 px-8 rounded-xl shadow-sm hover:bg-[#B81B22] transition-colors"
                >
                  Enable Access
                </button>
              </div>
            ) : appUsageData ? (
              <div className="space-y-4">
                {/* YouTube Premium (Present on all Android devices) */}
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="bg-red-100 text-red-600 p-3 rounded-xl font-bold">Y</div>
                    <div>
                      <p className="font-bold text-gray-900">YouTube</p>
                      <p className="text-xs text-gray-500">{((appUsageData['com.google.android.youtube'] || 0) / (1000 * 60 * 60)).toFixed(1)} hrs this month</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">SVI Score</p>
                    <p className="text-xl font-black text-[#D9222A]">
                      {(((appUsageData['com.google.android.youtube'] || 0) / (1000 * 60 * 60)) / 149 * 100).toFixed(1)} <span className="text-sm font-normal text-gray-500">pts/₹</span>
                    </p>
                  </div>
                </div>

                {/* Netflix Example */}
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="bg-purple-100 text-purple-600 p-3 rounded-xl font-bold">N</div>
                    <div>
                      <p className="font-bold text-gray-900">Netflix Premium</p>
                      <p className="text-xs text-gray-500">{((appUsageData['com.netflix.mediaclient'] || 0) / (1000 * 60 * 60)).toFixed(1)} hrs this month</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">SVI Score</p>
                    <p className="text-xl font-black text-[#D9222A]">
                      {(((appUsageData['com.netflix.mediaclient'] || 0) / (1000 * 60 * 60)) / 649 * 100).toFixed(1)} <span className="text-sm font-normal text-gray-500">pts/₹</span>
                    </p>
                  </div>
                </div>
                
                {/* Spotify Example */}
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl font-bold">S</div>
                    <div>
                      <p className="font-bold text-gray-900">Spotify</p>
                      <p className="text-xs text-gray-500">{((appUsageData['com.spotify.music'] || 0) / (1000 * 60 * 60)).toFixed(1)} hrs this month</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">SVI Score</p>
                    <p className="text-xl font-black text-[#D9222A]">
                      {(((appUsageData['com.spotify.music'] || 0) / (1000 * 60 * 60)) / 179 * 100).toFixed(1)} <span className="text-sm font-normal text-gray-500">pts/₹</span>
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">Calculating SVI...</div>
            )}
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#ECECEE]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">Recent Transactions</h3>
                <button className="flex items-center space-x-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
                  <span>110 transactions so far this month</span>
                  <ChevronRight size={14} className="text-gray-400" />
                </button>
             </div>

             <div className="hidden md:flex justify-between text-xs font-bold text-gray-900 uppercase mb-4 px-2">
                <span className="w-16">Date</span>
                <div className="flex-1 ml-4">Name</div>
                <span className="w-24 text-right">Amount</span>
             </div>

             <div className="space-y-1 overflow-hidden">
                {transactions.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-4 px-2 hover:bg-gray-50 rounded-xl cursor-pointer group transition-colors w-full">
                    <span className="text-sm text-gray-500 font-medium w-12 md:w-16 shrink-0">{tx.date}</span>
                    <div className="flex-1 flex items-center space-x-2 md:space-x-4 min-w-0 pr-2">
                      <div className="text-gray-900 font-medium text-sm flex items-center min-w-0 w-full">
                        <span className="truncate">{tx.name}</span>
                        {tx.status === 'pending' && <span className="ml-2 text-gray-400 font-normal shrink-0 text-xs md:text-sm">(pending)</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
                       <div className="hidden md:block bg-blue-100 text-blue-600 p-1.5 rounded-full shrink-0">
                         {getIcon(tx.name)}
                       </div>
                       <span className="text-sm font-bold tabular-nums text-gray-900 text-right shrink-0">₹{tx.amount.toFixed(2)}</span>
                       <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 hidden md:block" />
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Sidebar / Active e-Mandates & AutoPay */}
        <div className="space-y-6">
           {/* Section Header */}
           <div className="flex justify-between items-center px-1">
              <div className="flex items-center space-x-2">
                <ShieldCheck size={18} className="text-[#D9222A]" />
                <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">SVI & AutoPay Radar</h3>
              </div>
              <button 
                onClick={() => setCurrentView('mandates')}
                className="text-xs font-bold text-[#D9222A] hover:underline"
              >
                View SVI Radar →
              </button>
           </div>

           {/* Pre-Debit Alert Pill */}
           <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl flex items-start space-x-3">
             <div className="p-2 bg-amber-100 text-amber-800 rounded-xl mt-0.5 shrink-0">
               <Clock size={16} />
             </div>
             <div>
               <p className="text-xs font-bold text-amber-900">Next Auto-Debit in 4 Days</p>
               <p className="text-[11px] text-amber-700 mt-0.5">
                 ₹649.00 for Netflix Premium via HDFC UPI AutoPay. RBI 72h pre-debit notice verified.
               </p>
             </div>
           </div>

           {/* Channels List */}
           <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#ECECEE] overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">Payment Channel</span>
                <span className="font-bold text-gray-500">Authorized Outflow</span>
              </div>

              {subscriptions.reduce((acc: { name: string; count: number; total: number }[], s) => {
                const channel = s.linkedMandate || 'HDFC UPI AutoPay';
                const found = acc.find(c => c.name === channel);
                const monthly = s.isPaused ? 0 : s.cycle === 'Annual' ? s.amount / 12 : s.cycle === 'Quarterly' ? s.amount / 3 : s.amount;
                if (found) {
                  found.count += 1;
                  found.total += monthly;
                } else {
                  acc.push({ name: channel, count: 1, total: monthly });
                }
                return acc;
              }, []).map((ch, index, arr) => (
                <div 
                  key={ch.name} 
                  onClick={() => setCurrentView('mandates')}
                  className={clsx(
                    "flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors", 
                    index !== arr.length - 1 && "border-b border-gray-50"
                  )}
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div className="p-2 bg-gray-100 text-gray-600 rounded-xl shrink-0">
                      {ch.name.toLowerCase().includes('card') ? <CreditCard size={18} /> : <Building2 size={18} />}
                    </div>
                    <div className="truncate min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 truncate">{ch.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{ch.count} {ch.count === 1 ? 'mandate' : 'mandates'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-bold tabular-nums text-[13px] text-gray-900">
                      ₹{ch.total.toLocaleString('en-IN', { minimumFractionDigits: 0 })}/mo
                    </span>
                    <ChevronRight size={14} className="text-gray-400" />
                  </div>
                </div>
              ))}
           </div>

           {/* Bank Statement Upload to Discover Subscriptions */}
           <div className="bg-white rounded-3xl p-5 border border-[#ECECEE] shadow-sm space-y-3">
             <div className="flex items-center space-x-2 text-gray-900">
               <RefreshCcw size={16} className="text-[#D9222A]" />
               <h4 className="text-xs font-bold uppercase tracking-wide">Auto-Discover Subscriptions</h4>
             </div>
             <p className="text-xs text-gray-500 leading-relaxed">
               Ingest your bank or credit card statement CSV to autonomously detect recurring auto-debits using our clustering engine.
             </p>
             <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
             <button
               onClick={() => fileInputRef.current?.click()}
               className="w-full bg-gray-900 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
             >
               <span>Upload Statement CSV</span>
             </button>
           </div>
        </div>
      </main>
    </div>
  );
}
