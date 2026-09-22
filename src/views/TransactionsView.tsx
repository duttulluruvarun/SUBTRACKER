import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useAppStore } from '../store/useAppStore';
import { Search, ChevronDown, Filter, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function TransactionsView() {
  const transactions = useAppStore(state => state.transactions);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = transactions.filter(tx => 
    tx.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAccount = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('rent') || n.includes('imps')) return 'HDFC Salary A/c ••9021';
    if (n.includes('cred') || n.includes('creditcard')) return 'HDFC Regalia ••4821';
    if (n.includes('zomato') || n.includes('swiggy')) return 'ICICI Coral ••3312';
    if (n.includes('netflix') || n.includes('razorpay')) return 'SBI SimplyCLICK ••5540';
    return 'HDFC Bank ••4821';
  };

  const getCategory = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('zomato') || n.includes('swiggy')) return 'Food & Dining';
    if (n.includes('netflix')) return 'OTT & Streaming';
    if (n.includes('cred') || n.includes('creditcard')) return 'Credit Card Bill';
    if (n.includes('rent')) return 'Housing & Rent';
    if (n.includes('gym')) return 'Fitness & Health';
    return 'UPI & Utilities';
  };

  return (
    <div className="flex bg-surface-gray min-h-screen">
      <Sidebar />
      <main className="lg:ml-[240px] flex-1 p-4 pt-[72px] lg:pt-10 lg:p-10 pb-[100px] lg:pb-10 w-full max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">All Transactions</h1>
            <p className="text-sm text-gray-500 mt-1">Search, inspect, split, or categorize all linked debit and credit transactions.</p>
          </div>
          <button className="bg-yellow-100 text-yellow-800 px-6 py-2.5 rounded-xl font-medium text-sm flex items-center space-x-2 border border-yellow-200 shadow-sm hover:bg-yellow-200 transition-colors">
            <span>12 to review</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#ECECEE] flex items-center space-x-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-crimson/20 focus:border-brand-crimson transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors">
            <span>All Accounts</span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>
          <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors">
            <span>Category</span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>
          <button className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors">
            <span>Last 30 Days</span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>
          <button className="px-3 py-2.5 border border-gray-200 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors">
            <Filter size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="bg-white rounded-3xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#ECECEE]">
          {searchQuery && (
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <p className="text-sm text-gray-900">Showing search results for <span className="font-bold">"{searchQuery}"</span></p>
              <p className="text-sm text-gray-500">{filteredTransactions.length} matches found</p>
            </div>
          )}

          {!searchQuery && (
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">Recent Transactions</p>
            </div>
          )}

          {filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-[120px_1fr_150px_150px_100px] gap-4 px-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                <div>Date</div>
                <div>Merchant / Description</div>
                <div>Account</div>
                <div>Category</div>
                <div className="text-right">Amount</div>
              </div>

              {filteredTransactions.map((tx, i) => (
                <div key={i} className="grid grid-cols-[120px_1fr_150px_150px_100px] gap-4 items-center px-4 py-3 rounded-2xl hover:bg-gray-50 transition-colors group cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="text-sm text-gray-500">{tx.date}</div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                      {tx.name.charAt(0)}
                    </div>
                    <div className="font-bold text-gray-900 text-sm truncate">{tx.name}</div>
                    {tx.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 uppercase tracking-wider ml-2">Pending</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 truncate">{getAccount(tx.name)}</div>
                  <div className="text-[12px] bg-gray-100 text-gray-600 px-3 py-1 rounded-lg font-medium inline-block w-max">{getCategory(tx.name)}</div>
                  <div className={clsx(
                    "text-right text-sm font-bold",
                    tx.amount > 0 ? "text-gray-900" : "text-green-600"
                  )}>
                    {tx.amount > 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-4">
              <p className="font-bold text-gray-900 mb-2">Looking for more transactions?</p>
              <p className="text-sm text-gray-500 mb-6">Clear your query or widen the date range to find past outgoings.</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-brand-crimson text-sm font-bold hover:text-red-700 flex items-center space-x-1 mx-auto"
              >
                <span>Clear Search Filter</span>
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
