import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { RefreshCw, ArrowRight } from 'lucide-react';
import GoogleSignInButton from '../components/auth/GoogleSignInButton';
import GoogleAccountChooserModal from '../components/auth/GoogleAccountChooserModal';

export default function LoginView() {
  const setCurrentView = useAppStore(state => state.setCurrentView);
  const setUser = useAppStore(state => state.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Capitalize the part of the email before @ for a default name
      const defaultName = email.split('@')[0];
      const name = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      setUser(name, email);
      setCurrentView('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-brand-crimson mb-4 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <RefreshCw size={40} className="stroke-[3px]" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to SubTracker
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <span className="font-medium text-brand-crimson hover:text-[#B81B22] cursor-pointer" onClick={() => setCurrentView('signup')}>
            create a new account
          </span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-[#ECECEE]">
          {/* Continue with Google */}
          <div className="mb-6">
            <GoogleSignInButton 
              onClick={() => setIsGoogleModalOpen(true)} 
              text="Continue with Google"
            />
            
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-gray-500 font-medium tracking-wider">
                  Or continue with email
                </span>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-crimson focus:border-brand-crimson sm:text-sm"
                  placeholder="nitin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-crimson focus:border-brand-crimson sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-brand-crimson focus:ring-brand-crimson border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-brand-crimson hover:text-[#B81B22]">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#D9222A] hover:bg-[#B81B22] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-crimson transition-colors"
              >
                Sign in <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  For demonstration purposes, just click Sign In.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Account Selector Modal */}
      <GoogleAccountChooserModal 
        isOpen={isGoogleModalOpen} 
        onClose={() => setIsGoogleModalOpen(false)} 
      />
    </div>
  );
}
