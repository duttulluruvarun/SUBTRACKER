import { useAppStore } from '../store/useAppStore';
import { ChevronDown, RefreshCw, Target, PieChart, Calculator, Wallet, BarChart3, Smartphone, FileText, Brain, HeartCrack, Globe2 } from 'lucide-react';

export default function LandingView() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const isMegaMenuOpen = useAppStore((state) => state.isMegaMenuOpen);
  const setMegaMenuOpen = useAppStore((state) => state.setMegaMenuOpen);

  const navLinks = ['Features', 'About Us', 'Security', 'FAQ'];

  return (
    <div className="bg-white min-h-screen font-sans overflow-x-hidden">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-[#ECECEE] relative z-50 bg-white">
        <div className="flex items-center space-x-2">
          <div className="text-brand-crimson">
            <RefreshCw size={28} className="stroke-[3px]" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900">SubTracker</span>
        </div>
        
        <div className="hidden md:flex items-center space-x-8 text-[15px] font-medium text-gray-700">
          <div 
            className="relative flex items-center cursor-pointer hover:text-gray-900 h-full py-2"
            onMouseEnter={() => setMegaMenuOpen(true)}
            onMouseLeave={() => setMegaMenuOpen(false)}
          >
            Features <ChevronDown size={16} className="ml-1" />
            
            {/* Mega Menu Dropdown */}
            {isMegaMenuOpen && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[800px] bg-white rounded-2xl shadow-xl border border-gray-100 p-6 grid grid-cols-2 gap-x-8 gap-y-6">
                <MenuFeature icon={<RefreshCw size={24} />} title="Manage Subscriptions" desc="We'll automatically find your subscriptions and bills for you." />
                <MenuFeature icon={<Target size={24} />} title="Financial Goals" desc="Save money without thinking about it." />
                <MenuFeature icon={<PieChart size={24} />} title="Spending Insights" desc="Track spending across all of your accounts in one place." />

                <MenuFeature icon={<Calculator size={24} />} title="UPI AutoPay & e-Mandates" desc="Track recurring auto-debits and manage e-mandates before surprise deductions." />
                <MenuFeature icon={<Wallet size={24} />} title="Budgeting" desc="Track spending and set goals for your top categories." />
                <MenuFeature icon={<BarChart3 size={24} />} title="Net Worth" desc="Link all of your assets & debts for your full financial picture." />
                <MenuFeature icon={<Smartphone size={24} />} title="Widgets" desc="Stay on top of your finances from your phone's homescreen." />
              </div>
            )}
          </div>
          {navLinks.map(link => (
            <a 
              key={link} 
              href={link === 'About Us' ? '#about' : '#'} 
              className="hover:text-gray-900 transition-colors"
            >
              {link}
            </a>
          ))}
        </div>

        <div className="flex items-center space-x-6">
          <button className="text-[15px] font-medium text-gray-700 hover:text-gray-900" onClick={() => setCurrentView('login')}>Log In</button>
          <button 
            onClick={() => setCurrentView('login')}
            className="bg-[#D9222A] text-white rounded-full px-6 py-2.5 font-medium hover:bg-[#B81B22] transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="max-w-xl">
          <div className="w-12 h-1 bg-brand-crimson mb-6 rounded-full"></div>
          <h1 className="text-[56px] leading-[1.1] font-extrabold tracking-tight text-gray-900 mb-6">
            The Money App<br/>That Works For You
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Managing money is hard, but you don't have to do it alone. SubTracker empowers you to save more, spend less, see everything, and take back control of your financial life.
          </p>
          <button 
            onClick={() => setCurrentView('signup')}
            className="bg-[#D9222A] text-white rounded-xl px-8 py-4 font-bold text-lg hover:bg-[#B81B22] transition-colors shadow-lg shadow-red-500/20"
          >
            Sign Up
          </button>
        </div>

        <div className="relative mx-auto w-[480px] flex flex-col">
          <img 
            src="/dashboard-mockup.png" 
            alt="SubTracker App Mockup" 
            className="w-full h-auto object-cover rounded-[48px] shadow-2xl ring-4 ring-gray-100"
          />
        </div>
      </main>

      {/* Comparison Section */}
      <section className="bg-gray-50 py-24 border-t border-[#ECECEE]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Why Choose SubTracker?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We built SubTracker from the ground up for privacy, intelligence, and the Indian market. See how we compare against traditional apps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Point 1 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#ECECEE] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110"></div>
              <FileText size={32} className="text-blue-500 mb-6 relative z-10" />
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10">Data Ingestion & Privacy</h3>
              <p className="text-gray-600 mb-4 relative z-10 text-[15px] leading-relaxed">
                <strong className="text-gray-900">Traditional Apps:</strong> Require you to link live bank accounts via APIs, giving third-parties continuous read access to your entire financial history.
              </p>
              <p className="text-gray-600 relative z-10 text-[15px] leading-relaxed">
                <strong className="text-brand-crimson">SubTracker:</strong> Designed with a privacy-first approach using offline CSV statements. Your sensitive bank credentials are never linked or shared with third-party aggregators.
              </p>
            </div>

            {/* Point 2 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#ECECEE] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110"></div>
              <Brain size={32} className="text-purple-500 mb-6 relative z-10" />
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10">Unsupervised Machine Learning</h3>
              <p className="text-gray-600 mb-4 relative z-10 text-[15px] leading-relaxed">
                <strong className="text-gray-900">Traditional Apps:</strong> Rely heavily on hardcoded rule engines and massive databases of known merchants.
              </p>
              <p className="text-gray-600 relative z-10 text-[15px] leading-relaxed">
                <strong className="text-brand-crimson">SubTracker:</strong> Uses DBSCAN & NLP. Our AI mathematically clusters transactions to autonomously discover any recurring charge—from famous global services to a tiny local gym.
              </p>
            </div>

            {/* Point 3 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#ECECEE] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110"></div>
              <HeartCrack size={32} className="text-red-500 mb-6 relative z-10" />
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10">The "Zombie" Detection Metric</h3>
              <p className="text-gray-600 mb-4 relative z-10 text-[15px] leading-relaxed">
                <strong className="text-gray-900">Traditional Apps:</strong> Only tell you what you are paying for, not if you actually use it.
              </p>
              <p className="text-gray-600 relative z-10 text-[15px] leading-relaxed">
                <strong className="text-brand-crimson">SubTracker:</strong> Introduces the Subscription Value Index (SVI). We cross-reference cost against actual usage. The AI flags "Zombie Subscriptions" telling you exactly why it's a waste of money.
              </p>
            </div>

            {/* Point 4 */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#ECECEE] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110"></div>
              <Globe2 size={32} className="text-green-500 mb-6 relative z-10" />
              <h3 className="text-xl font-bold text-gray-900 mb-3 relative z-10">Tailored for the Indian Ecosystem</h3>
              <p className="text-gray-600 mb-4 relative z-10 text-[15px] leading-relaxed">
                <strong className="text-gray-900">Traditional & Foreign Apps:</strong> Built for Western banking infrastructure (like Plaid/Yodlee) with rigid merchant databases that fail to understand Indian UPI handles, IFSC narrations, or RBI recurring payment mandates.
              </p>
              <p className="text-gray-600 relative z-10 text-[15px] leading-relaxed">
                <strong className="text-brand-crimson">SubTracker:</strong> Purpose-built for India's digital payment ecosystem (+91 KYC). Our NLP effortlessly interprets messy Indian UPI narratives (Razorpay, Paytm, PhonePe, CRED, BharatPe) and bank statements (HDFC, SBI, ICICI, Axis, Kotak) with zero privacy compromise.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-6">About Us</h2>
            <div className="w-16 h-1 bg-brand-crimson mb-8 rounded-full"></div>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              We started SubTracker because we noticed a growing problem: the subscription economy is booming, but our ability to track where our money goes is lagging behind. We were tired of sneaky auto-renewals, opaque banking charges, and apps that required us to hand over our banking credentials just to see our own data.
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              Based in India, our mission is simple: to give consumers back their financial autonomy. By utilizing secure offline CSV parsing and advanced machine learning (DBSCAN), we've built a privacy-first tool that actually works for you—not advertisers. No data selling, no hidden fees, just absolute clarity on your spending.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-3xl p-8 border border-[#ECECEE] text-center">
              <h3 className="text-4xl font-extrabold text-brand-crimson mb-2">0</h3>
              <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">Data Breaches</p>
            </div>
            <div className="bg-gray-50 rounded-3xl p-8 border border-[#ECECEE] text-center">
              <h3 className="text-4xl font-extrabold text-brand-crimson mb-2">100%</h3>
              <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">Client-Side</p>
            </div>
            <div className="bg-gray-50 rounded-3xl p-8 border border-[#ECECEE] text-center col-span-2">
              <h3 className="text-4xl font-extrabold text-brand-crimson mb-2">₹10K+</h3>
              <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">Avg. Savings per user (Yearly)</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MenuFeature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex space-x-4 group cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
      <div className="text-gray-400 group-hover:text-brand-crimson mt-1 transition-colors">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-500 leading-snug">{desc}</p>
      </div>
    </div>
  );
}
