import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { AreaChart, Area, XAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ArrowUp, Download, Landmark, PiggyBank, TrendingUp, Briefcase, CreditCard, Car } from 'lucide-react';

const mockChartData: Record<string, { month: string, value: number }[]> = {
  '1M': [
    { month: 'Sep 1', value: 925000 },
    { month: 'Sep 7', value: 932000 },
    { month: 'Sep 14', value: 938000 },
    { month: 'Sep 21', value: 942500 },
    { month: 'Sep 28', value: 948934 },
  ],
  '6M': [
    { month: 'Apr', value: 780000 },
    { month: 'May', value: 810000 },
    { month: 'Jun', value: 845000 },
    { month: 'Jul', value: 880000 },
    { month: 'Aug', value: 915000 },
    { month: 'Sep', value: 948934 },
  ],
  '1Y': [
    { month: 'Oct', value: 650000 },
    { month: 'Dec', value: 710000 },
    { month: 'Feb', value: 740000 },
    { month: 'Apr', value: 780000 },
    { month: 'Jun', value: 845000 },
    { month: 'Aug', value: 915000 },
    { month: 'Sep', value: 948934 },
  ],
  'ALL': [
    { month: '2022', value: 250000 },
    { month: '2023', value: 420000 },
    { month: '2024', value: 610000 },
    { month: '2025', value: 790000 },
    { month: '2026', value: 948934 },
  ]
};

export default function NetWorthView() {
  const [timePeriod, setTimePeriod] = useState('1Y');
  
  const chartData = mockChartData[timePeriod] || mockChartData['1Y'];

  const handleDownload = () => {
    // Generate simple CSV
    const headers = "Date,NetWorth\n";
    const rows = chartData.map(d => `${d.month},${d.value}`).join('\n');
    const csvContent = headers + rows;
    
    // Create Blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `net_worth_${timePeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBtnClass = (period: string) => 
    timePeriod === period 
      ? "px-4 py-1.5 text-[13px] font-bold text-white bg-gray-900 rounded-lg"
      : "px-4 py-1.5 text-[13px] font-bold text-gray-500 rounded-lg hover:bg-gray-50 transition-colors";

  return (
    <div className="flex bg-[#F7F7F8] min-h-screen">
      <Sidebar />
      <main className="lg:ml-[240px] flex-1 p-4 pt-[72px] lg:pt-10 lg:p-10 pb-[100px] lg:pb-10 w-full max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Net Worth</h1>
            <p className="text-[15px] text-gray-500 font-medium">Real-time summary of your assets, liabilities, and multi-account equity.</p>
          </div>
           <div className="flex items-center space-x-3">
             <div className="flex bg-white rounded-xl border border-[#ECECEE] p-1 shadow-sm">
                {['1M', '6M', '1Y', 'ALL'].map(period => (
                  <button 
                    key={period} 
                    onClick={() => setTimePeriod(period)}
                    className={getBtnClass(period)}
                  >
                    {period}
                  </button>
                ))}
             </div>
             <button 
               onClick={handleDownload}
               className="w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center hover:bg-gray-800 shadow-sm transition-colors"
               title="Download CSV"
             >
               <Download size={18} />
             </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm">
             <h3 className="text-[13px] text-gray-500 font-medium mb-3">Total Net Worth</h3>
             <p className="text-3xl font-bold text-gray-900 mb-2">₹9,48,934.00</p>
             <div className="flex items-center space-x-1 text-[#16A34A] text-[13px] font-medium">
               <ArrowUp size={14} />
               <span>+₹1,58,934 (20.1%) this year</span>
             </div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm">
             <h3 className="text-[13px] text-gray-500 font-medium mb-3">Total Assets</h3>
             <p className="text-3xl font-bold text-gray-900 mb-2">₹12,15,000.00</p>
             <p className="text-[13px] text-gray-500 font-medium">Savings, FDs, Mutual Funds & EPF</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-[#ECECEE] shadow-sm">
             <h3 className="text-[13px] text-gray-500 font-medium mb-3">Total Liabilities</h3>
             <p className="text-3xl font-bold text-gray-900 mb-2">₹2,66,066.00</p>
             <p className="text-[13px] text-[#D9222A] font-medium">Credit Cards & Auto Loans</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
          {/* Net Worth Chart */}
          <div className="bg-white rounded-2xl p-8 border border-[#ECECEE] shadow-sm flex flex-col">
             <div className="mb-8">
               <h3 className="text-[17px] font-bold text-gray-900">Net Worth Over Time</h3>
               <p className="text-[13px] text-gray-500 font-medium mt-1">Trailing 12-month balance progression</p>
             </div>

             <div className="flex-1 w-full relative min-h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 500 }}
                    dy={15}
                  />

                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#nwGradient)"
                    activeDot={{ r: 5, fill: '#fff', stroke: '#10B981', strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              
              {/* Fake Tooltip at Sep for exact visual match */}
              <div className="absolute right-[10px] top-[15%] bg-[#111827] text-white text-xs font-bold px-4 py-3 rounded-lg shadow-lg translate-y-[-100%] translate-x-[20%]">
                Now: ₹9,48,934
              </div>
             </div>
          </div>

          {/* Assets & Liabilities List */}
          <div className="bg-white rounded-2xl p-8 border border-[#ECECEE] shadow-sm flex flex-col">
             <div className="mb-6">
               <h3 className="text-[17px] font-bold text-gray-900">Assets & Liabilities</h3>
               <p className="text-[13px] text-gray-500 font-medium mt-1">Connected accounts snapshot</p>
             </div>

             <div className="space-y-6 flex-1">
                {/* Assets Section */}
                <div>
                   <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                     <span>Assets</span>
                     <span className="text-[#16A34A]">₹12,15,000.00</span>
                   </div>
                   <div className="space-y-3">
                     <div className="flex items-center justify-between text-[13px] font-medium text-gray-700">
                        <div className="flex items-center space-x-3">
                          <Landmark size={14} className="text-gray-400" />
                          <span>Cash & Savings Account</span>
                        </div>
                        <span className="tabular-nums font-bold text-gray-900">₹1,25,000.00</span>
                     </div>
                     <div className="flex items-center justify-between text-[13px] font-medium text-gray-700">
                        <div className="flex items-center space-x-3">
                          <PiggyBank size={14} className="text-gray-400" />
                          <span>Fixed Deposits (FD) & Liquid Funds</span>
                        </div>
                        <span className="tabular-nums font-bold text-gray-900">₹3,50,000.00</span>
                     </div>
                     <div className="flex items-center justify-between text-[13px] font-medium text-gray-700">
                        <div className="flex items-center space-x-3">
                          <TrendingUp size={14} className="text-gray-400" />
                          <span>Mutual Funds & Equities (Zerodha/Groww)</span>
                        </div>
                        <span className="tabular-nums font-bold text-gray-900">₹5,00,000.00</span>
                     </div>
                     <div className="flex items-center justify-between text-[13px] font-medium text-gray-700">
                        <div className="flex items-center space-x-3">
                          <Briefcase size={14} className="text-gray-400" />
                          <span>Retirement (EPF / PPF / NPS)</span>
                        </div>
                        <span className="tabular-nums font-bold text-gray-900">₹2,40,000.00</span>
                     </div>
                   </div>
                </div>

                {/* Liabilities Section */}
                <div className="pt-4">
                   <div className="flex justify-between items-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                     <span>Liabilities</span>
                     <span className="text-[#D9222A]">-₹2,66,066.00</span>
                   </div>
                   <div className="space-y-3">
                     <div className="flex items-center justify-between text-[13px] font-medium text-gray-700">
                        <div className="flex items-center space-x-3">
                          <CreditCard size={14} className="text-gray-400" />
                          <span>Credit Card Balances (HDFC/ICICI)</span>
                        </div>
                        <span className="tabular-nums font-bold text-gray-900">₹45,000.00</span>
                     </div>
                     <div className="flex items-center justify-between text-[13px] font-medium text-gray-700">
                        <div className="flex items-center space-x-3">
                          <Car size={14} className="text-gray-400" />
                          <span>Auto & Personal Loan</span>
                        </div>
                        <span className="tabular-nums font-bold text-gray-900">₹2,21,066.00</span>
                     </div>
                   </div>
                </div>
             </div>

             {/* Footer Button */}
             <button className="mt-8 w-full border border-gray-200 text-[#D9222A] bg-gray-50 hover:bg-gray-100 font-bold py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 text-[13px]">
               <span>+ Link Financial Account</span>
             </button>
          </div>
        </div>

      </main>
    </div>
  );
}
