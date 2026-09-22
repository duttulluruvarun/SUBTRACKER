import { useAppStore } from '../../store/useAppStore';
import { X, ShieldCheck } from 'lucide-react';
import { type GoogleUserProfile } from '../../utils/googleAuth';

interface GoogleAccountItem {
  name: string;
  email: string;
  avatar: string;
  isCurrent?: boolean;
}

const GOOGLE_ACCOUNTS: GoogleAccountItem[] = [
  {
    name: 'Nitin Sharma',
    email: 'nitin.sharma@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
    isCurrent: true,
  },
  {
    name: 'Nitin Sharma (Work)',
    email: 'nitin@fintechindia.in',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
  },
  {
    name: 'Varun D.',
    email: 'dvarun@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSuccess?: (user: GoogleUserProfile) => void;
}

export default function GoogleAccountChooserModal({ isOpen, onClose, onSelectSuccess }: Props) {
  const setUser = useAppStore((state) => state.setUser);
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const handleSelectAccount = (acc: GoogleAccountItem) => {
    setUser(acc.name, acc.email, acc.avatar, 'google');
    if (onSelectSuccess) {
      onSelectSuccess({
        id: `g_${acc.email}`,
        name: acc.name,
        email: acc.email,
        picture: acc.avatar,
      });
    }
    onClose();
    setCurrentView('dashboard');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-[420px] bg-white rounded-[28px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with Google Logo and Close Button */}
        <div className="relative px-8 pt-8 pb-3 text-center border-b border-gray-50">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>

          {/* Official Google G Logo */}
          <div className="flex justify-center mb-3">
            <svg className="w-9 h-9" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.79l7.97-6.2z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </div>

          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Choose an account</h3>
          <p className="text-sm text-gray-500 mt-0.5">to continue to <span className="font-semibold text-gray-900">SubTracker</span></p>
        </div>

        {/* Google Accounts List */}
        <div className="p-6 space-y-2">
          {GOOGLE_ACCOUNTS.map((acc) => (
            <div
              key={acc.email}
              onClick={() => handleSelectAccount(acc)}
              className="flex items-center space-x-4 p-3.5 rounded-2xl hover:bg-gray-50 border border-gray-100 hover:border-gray-300 cursor-pointer transition-all group"
            >
              <img
                src={acc.avatar}
                alt={acc.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-brand-crimson/30 group-hover:scale-105 transition-all"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900 truncate group-hover:text-brand-crimson transition-colors">
                    {acc.name}
                  </p>
                  {acc.isCurrent && (
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                      Signed In
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{acc.email}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Google Privacy Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-500 leading-relaxed flex items-center justify-center space-x-1.5">
            <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
            <span>To continue, Google will share your name, email, and profile picture with SubTracker.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
