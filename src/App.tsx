import { useAppStore } from './store/useAppStore';
import LandingView from './views/LandingView';
import LoginView from './views/LoginView';
import SignUpView from './views/SignUpView';
import DashboardView from './views/DashboardView';
import TransactionsView from './views/TransactionsView';
import BudgetView from './views/BudgetView';
import RecurringView from './views/RecurringView';
import SpendingView from './views/SpendingView';
import AutoPayRadarView from './views/AutoPayRadarView';


function App() {
  const currentView = useAppStore((state) => state.currentView);

  return (
    <div className="min-h-screen font-sans bg-surface-gray">
      {currentView === 'landing' && <LandingView />}
      {currentView === 'login' && <LoginView />}
      {currentView === 'signup' && <SignUpView />}
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'transactions' && <TransactionsView />}
      {currentView === 'budgets' && <BudgetView />}
      {currentView === 'recurring' && <RecurringView />}
      {currentView === 'spending' && <SpendingView />}
      {currentView === 'mandates' && <AutoPayRadarView />}

    </div>
  );
}

export default App;
