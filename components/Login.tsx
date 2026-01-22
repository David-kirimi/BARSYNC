
import React, { useState } from 'react';
import { User, Business, Role } from '../types';

interface LoginProps {
  onLogin: (user: User, business?: Business, initialState?: any) => void;
  backendUrl: string;
}

const Login: React.FC<LoginProps> = ({ onLogin, backendUrl }) => {
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDemoOption, setShowDemoOption] = useState(false);

  const handleLoginAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setShowDemoOption(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    try {
      // In unified repo, fetch with relative path if backendUrl is empty
      const targetUrl = backendUrl ? `${backendUrl}/api/auth/login` : '/api/auth/login';
      
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, username, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      
      // If we got HTML instead of JSON, the backend isn't handling the request (likely 404/SPA fallback)
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        if (text.trim().startsWith('<!DOCTYPE')) {
          throw new Error("SERVER_FALLBACK: Backend not active in this environment.");
        }
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Authentication failed');
      }

      onLogin(result.user, result.business, result.state);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Login Failure:", err);
      
      if (err.name === 'AbortError') {
        setError('Connection timed out. Checking local mirror...');
        setShowDemoOption(true);
      } else if (err.message.includes('SERVER_FALLBACK')) {
        setError('Cloud database currently unreachable in this preview.');
        setShowDemoOption(true);
      } else if (err.message.includes('Unexpected token')) {
        setError('Invalid response from server. Backend routes may be missing.');
        setShowDemoOption(true);
      } else {
        setError(err.message || 'Unable to connect to BarSync Cloud');
        setShowDemoOption(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const enterDemoMode = () => {
    const mockUser: User = {
      id: 'demo_user',
      name: username || 'STAFF',
      role: (username && username.toUpperCase() === 'SLIEM') ? Role.SUPER_ADMIN : (businessName ? Role.ADMIN : Role.BARTENDER),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'Demo'}`,
      businessId: 'bus_demo',
      status: 'Active'
    };
    onLogin(mockUser);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-500 rounded-[2rem] flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-2xl shadow-indigo-500/40 rotate-12">
            <i className="fa-solid fa-beer-mug-empty"></i>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase">BARSYNC</h1>
          <p className="text-indigo-400/80 font-medium uppercase tracking-[0.3em] text-[10px]">Cloud Terminal Gateway</p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-[3rem] p-10 shadow-2xl space-y-8 border border-white/20">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Sign In</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">MongoDB Secured Session</p>
          </div>

          <form onSubmit={handleLoginAttempt} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Workplace</label>
                <div className="relative">
                  <i className="fa-solid fa-building absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="text"
                    placeholder="e.g. The Junction (Leave blank for Platform)"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 transition-all"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Profile Name</label>
                <div className="relative">
                  <i className="fa-solid fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="text"
                    required
                    placeholder="Enter Username"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 transition-all"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Access PIN</label>
                <div className="relative">
                  <i className="fa-solid fa-key absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="password"
                    required
                    placeholder="••••••"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 tracking-widest transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-500 p-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center animate-shake">
                <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin"></i>
                    Checking MongoDB...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket"></i>
                    Enter Terminal
                  </>
                )}
              </button>

              {showDemoOption && (
                <button 
                  type="button"
                  onClick={enterDemoMode}
                  className="w-full py-4 bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all shadow-sm"
                >
                  Enter via Local Mirror (Demo Mode)
                </button>
              )}
            </div>
          </form>

          <div className="pt-6 border-t border-slate-50 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
               <i className="fa-solid fa-database"></i> Live Database Connection
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default Login;
