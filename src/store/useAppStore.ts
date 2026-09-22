import { create } from 'zustand';

type ViewState = 'landing' | 'login' | 'signup' | 'dashboard' | 'transactions' | 'budgets' | 'recurring' | 'spending' | 'mandates' | 'credit_score';

interface Account {
  name: string;
  balance: number;
  type: 'checking' | 'credit' | 'net_cash' | 'savings' | 'investments';
}

export interface Transaction {
  id?: string;
  date: string;
  name: string;
  category?: string;
  channel?: string;
  status: 'pending' | 'completed';
  amount: number;
}

export interface Subscription {
  id: string;
  name: string;
  category: string;
  cycle: string;
  nextDue: string;
  amount: number;
  action: string;
  svi: string;
  isZombie: boolean;
  iconInitial: string;
  iconColor: string;
  isPaused?: boolean;
  remindDaysBefore?: number;
  linkedMandate?: string;
  notes?: string;
}

export interface BudgetEnvelope {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  icon: string;
  color: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  category: string;
  icon: string;
  deadline?: string;
}

interface BudgetData {
  earnings: number;
  billsUtilities: number;
  everythingElse: number;
  spendingBudget: number;
  projectedSavings: number;
}

interface AppState {
  currentView: ViewState;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  authProvider: 'email' | 'google';
  googleClientId: string;
  isMegaMenuOpen: boolean;
  isBudgetModalOpen: boolean;
  accounts: Account[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  budgetData: BudgetData;
  envelopes: BudgetEnvelope[];
  savingsGoals: SavingsGoal[];
  appUsageData: Record<string, number> | null;
  isUsagePermissionGranted: boolean;
  setCurrentView: (view: ViewState) => void;
  setMegaMenuOpen: (isOpen: boolean) => void;
  setBudgetModalOpen: (isOpen: boolean) => void;
  addTransactions: (newTxs: Transaction[]) => void;
  removeSubscription: (id: string) => void;
  addSubscription: (sub: Subscription) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  updateEnvelope: (id: string, allocated: number) => void;
  addEnvelope: (envelope: BudgetEnvelope) => void;
  addSavingsGoal: (goal: SavingsGoal) => void;
  depositToGoal: (goalId: string, amount: number) => void;
  reallocateZombieSavings: (targetGoalId: string, amount: number) => void;
  updateBudgetData: (data: Partial<BudgetData>) => void;
  setUser: (name: string, email: string, avatar?: string, authProvider?: 'email' | 'google') => void;
  setGoogleClientId: (id: string) => void;
  checkUsagePermission: () => Promise<void>;
  requestUsagePermission: () => Promise<void>;
  fetchAppUsage: () => Promise<void>;
}

import SviMetrics from '../plugins/SviMetrics';

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  userName: 'Nitin',
  userEmail: 'nitin@example.com',
  userAvatar: undefined,
  authProvider: 'email',
  googleClientId: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '',
  isMegaMenuOpen: false,
  isBudgetModalOpen: false,
  appUsageData: null,
  isUsagePermissionGranted: false,
  accounts: [
    { name: 'Salary Account (HDFC)', balance: 125000, type: 'checking' },
    { name: 'HDFC Regalia Card', balance: 45000, type: 'credit' },
    { name: 'Net Cash', balance: 80000, type: 'net_cash' },
    { name: 'Savings', balance: 350000, type: 'savings' },
    { name: 'Investments', balance: 500000, type: 'investments' },
  ],
  transactions: [
    { id: 'tx1', date: 'Sep 17', name: 'Swiggy Gourmet Delivery', category: 'Food & Dining (Swiggy/Zomato)', channel: 'UPI / HDFC', status: 'completed', amount: 840.50 },
    { id: 'tx2', date: 'Sep 16', name: 'Zomato Evening Order', category: 'Food & Dining (Swiggy/Zomato)', channel: 'UPI / Paytm', status: 'completed', amount: 480.00 },
    { id: 'tx3', date: 'Sep 16', name: 'Blue Tokai Coffee Roasters', category: 'Food & Dining (Swiggy/Zomato)', channel: 'Card / HDFC Regalia', status: 'completed', amount: 350.00 },
    { id: 'tx4', date: 'Sep 15', name: 'BESCOM Electricity Bill', category: 'Bills & Utilities', channel: 'AutoPay / HDFC', status: 'completed', amount: 3400.00 },
    { id: 'tx5', date: 'Sep 14', name: 'Airtel Xstream Fiber Broadband', category: 'Bills & Utilities', channel: 'UPI AutoPay', status: 'completed', amount: 1179.00 },
    { id: 'tx6', date: 'Sep 13', name: 'Uber Premier (Airport Terminal)', category: 'Transport & Cab (Uber/Ola)', channel: 'Uber UPI', status: 'completed', amount: 1120.80 },
    { id: 'tx7', date: 'Sep 12', name: 'Ola Cabs Daily Commute', category: 'Transport & Cab (Uber/Ola)', channel: 'Ola Money', status: 'completed', amount: 450.00 },
    { id: 'tx8', date: 'Sep 11', name: 'Amazon Prime Order (Electronics)', category: 'Shopping & Retail', channel: 'Amazon Pay UPI', status: 'completed', amount: 2150.20 },
    { id: 'tx9', date: 'Sep 10', name: 'Myntra Autumn Apparel', category: 'Shopping & Retail', channel: 'HDFC Regalia Card', status: 'completed', amount: 1499.00 },
    { id: 'tx10', date: 'Sep 09', name: 'Netflix Premium Monthly', category: 'Subscriptions & OTT', channel: 'HDFC UPI AutoPay', status: 'completed', amount: 649.00 },
    { id: 'tx11', date: 'Sep 08', name: 'GitHub Copilot Subscription', category: 'Subscriptions & OTT', channel: 'SBI Debit Card', status: 'completed', amount: 830.00 },
    { id: 'tx12', date: 'Sep 07', name: 'Spotify Family Plan', category: 'Subscriptions & OTT', channel: 'Paytm UPI AutoPay', status: 'completed', amount: 179.00 },
    { id: 'tx13', date: 'Sep 06', name: 'Apollo Pharmacy Medicines', category: 'Health & Fitness', channel: 'UPI / PhonePe', status: 'completed', amount: 690.00 },
    { id: 'tx14', date: 'Sep 04', name: 'House Rent (September IMPS)', category: 'Bills & Utilities', channel: 'IMPS NetBanking', status: 'completed', amount: 9000.00 },
    { id: 'tx15', date: 'Sep 02', name: 'Swiggy Instamart Groceries', category: 'Food & Dining (Swiggy/Zomato)', channel: 'UPI / HDFC', status: 'completed', amount: 1240.00 },
  ],
  subscriptions: [
    { id: 'sub1', name: 'Netflix Premium', category: 'Streaming', cycle: 'Monthly', nextDue: 'Sep 22, 2026', amount: 649, action: 'Manage', svi: 'High (42 hrs)', isZombie: false, iconInitial: 'N', iconColor: 'bg-purple-100 text-purple-600', isPaused: false, remindDaysBefore: 3, linkedMandate: 'HDFC UPI AutoPay (razorpay.sub@hdfc)' },
    { id: 'sub2', name: 'Cult.fit Pass', category: 'Health & Gym', cycle: 'Monthly', nextDue: 'Sep 24, 2026', amount: 2500, action: 'Cancel ↗', svi: '0 visits (Zombie)', isZombie: true, iconInitial: 'C', iconColor: 'bg-pink-100 text-pink-600', isPaused: false, remindDaysBefore: 2, linkedMandate: 'ICICI e-Mandate Debit Card (Ending 4211)' },
    { id: 'sub3', name: 'Amazon Prime', category: 'Shopping', cycle: 'Annual', nextDue: 'Oct 04, 2026', amount: 1499, action: 'Review', svi: 'Good (14 orders)', isZombie: false, iconInitial: 'A', iconColor: 'bg-yellow-100 text-yellow-600', isPaused: false, remindDaysBefore: 7, linkedMandate: 'Amazon Pay UPI Mandate' },
    { id: 'sub4', name: 'GitHub Copilot', category: 'Developer Tools', cycle: 'Monthly', nextDue: 'Oct 12, 2026', amount: 830, action: 'Manage', svi: 'High (100+ hrs)', isZombie: false, iconInitial: 'G', iconColor: 'bg-green-100 text-green-600', isPaused: false, remindDaysBefore: 3, linkedMandate: 'SBI Global Int. Debit Card' },
    { id: 'sub5', name: 'Spotify Family', category: 'Music & Media', cycle: 'Monthly', nextDue: 'Oct 15, 2026', amount: 179, action: 'Manage', svi: 'High (30 hrs)', isZombie: false, iconInitial: 'S', iconColor: 'bg-emerald-100 text-emerald-600', isPaused: false, remindDaysBefore: 3, linkedMandate: 'Paytm UPI AutoPay' },
    { id: 'sub6', name: 'Google One Storage', category: 'Cloud Backup', cycle: 'Monthly', nextDue: 'Oct 18, 2026', amount: 130, action: 'Manage', svi: 'High (95% full)', isZombie: false, iconInitial: 'G', iconColor: 'bg-blue-100 text-blue-600', isPaused: false, remindDaysBefore: 3, linkedMandate: 'Google Play UPI AutoPay' },
    { id: 'sub7', name: 'Adobe Creative Cloud', category: 'Creative Software', cycle: 'Monthly', nextDue: 'Oct 27, 2026', amount: 4230, action: 'Cancel ↗', svi: 'Low (2 hrs)', isZombie: true, iconInitial: 'A', iconColor: 'bg-red-100 text-red-600', isPaused: false, remindDaysBefore: 5, linkedMandate: 'HDFC Regalia Credit Card e-Mandate' },
  ],
  budgetData: {
    earnings: 150000,
    billsUtilities: 40000,
    everythingElse: 60000,
    spendingBudget: 60000,
    projectedSavings: 50000,
  },
  envelopes: [
    { id: 'env_bills', name: 'Bills & Utilities', allocated: 16000, spent: 14500, icon: 'Building2', color: 'bg-red-500' },
    { id: 'env_food', name: 'Food & Dining (Swiggy/Zomato)', allocated: 10000, spent: 8400.50, icon: 'Utensils', color: 'bg-orange-500' },
    { id: 'env_subs', name: 'Subscriptions & OTT', allocated: 3000, spent: 2138.90, icon: 'Zap', color: 'bg-pink-500' },
    { id: 'env_shopping', name: 'Shopping & Retail', allocated: 6000, spent: 4200.20, icon: 'ShoppingBag', color: 'bg-purple-500' },
    { id: 'env_cabs', name: 'Transport & Cab (Uber/Ola)', allocated: 3500, spent: 2650.80, icon: 'Car', color: 'bg-blue-500' },
    { id: 'env_health', name: 'Health & Fitness', allocated: 4000, spent: 1090.00, icon: 'Heart', color: 'bg-emerald-500' },
  ],
  savingsGoals: [
    { id: 'goal_goa', name: 'Goa Vacation', target: 25000, current: 18000, category: 'Travel', icon: '🏖️', deadline: 'Dec 2026' },
    { id: 'goal_phone', name: 'New iPhone / Tech', target: 80000, current: 45000, category: 'Gadgets', icon: '📱', deadline: 'Jan 2027' },
    { id: 'goal_emergency', name: 'Emergency Cushion', target: 100000, current: 80000, category: 'Safety', icon: '🛡️', deadline: 'Ongoing' },
  ],
  setCurrentView: (view) => set({ currentView: view }),
  setMegaMenuOpen: (isOpen) => set({ isMegaMenuOpen: isOpen }),
  setBudgetModalOpen: (isOpen) => set({ isBudgetModalOpen: isOpen }),
  addTransactions: (newTxs) => set((state) => ({ transactions: [...newTxs, ...state.transactions] })),
  removeSubscription: (id) => set((state) => ({ subscriptions: state.subscriptions.filter(s => s.id !== id) })),
  addSubscription: (sub) => set((state) => ({ subscriptions: [...state.subscriptions, sub] })),
  updateSubscription: (id, updates) => set((state) => ({
    subscriptions: state.subscriptions.map((s) => (s.id === id ? { ...s, ...updates } : s))
  })),
  updateEnvelope: (id, allocated) => set((state) => ({
    envelopes: state.envelopes.map((e) => (e.id === id ? { ...e, allocated } : e))
  })),
  addEnvelope: (envelope) => set((state) => ({
    envelopes: [...state.envelopes, envelope]
  })),
  addSavingsGoal: (goal) => set((state) => ({
    savingsGoals: [...state.savingsGoals, goal]
  })),
  depositToGoal: (goalId, amount) => set((state) => ({
    savingsGoals: state.savingsGoals.map((g) => (g.id === goalId ? { ...g, current: Math.min(g.target, g.current + amount) } : g))
  })),
  reallocateZombieSavings: (targetGoalId, amount) => set((state) => ({
    savingsGoals: state.savingsGoals.map((g) => (g.id === targetGoalId ? { ...g, current: Math.min(g.target, g.current + amount) } : g))
  })),
  updateBudgetData: (data) => set((state) => ({
    budgetData: { ...state.budgetData, ...data }
  })),
  setUser: (name, email, avatar, authProvider = 'email') => set({ userName: name, userEmail: email, userAvatar: avatar, authProvider }),
  setGoogleClientId: (id) => set({ googleClientId: id }),
  
  checkUsagePermission: async () => {
    try {
      const { granted } = await SviMetrics.checkPermissions();
      set({ isUsagePermissionGranted: granted });
    } catch {
      console.warn("Usage Stats not available on this platform");
    }
  },
  
  requestUsagePermission: async () => {
    try {
      await SviMetrics.requestPermissions();
    } catch (e: any) {
      alert("Plugin Error: " + e.message);
      console.warn("Could not request permissions", e);
    }
  },
  
  fetchAppUsage: async () => {
    try {
      const usage = await SviMetrics.getAppUsage();
      set({ appUsageData: usage });
    } catch (e: any) {
      alert("Fetch Error: " + e.message);
      console.warn("Could not fetch app usage", e);
    }
  }
}));
