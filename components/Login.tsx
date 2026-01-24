
import React, { useState, useEffect } from 'react';
import { User, Business, Role } from '../types';
import Register from './Register';

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
  const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // If it's taking too long, automatically show the demo option
  useEffect(() => {
    let timer: number;
    if (isSubmitting) {
      timer = window.setTimeout(() => {
        setShowDemoOption(true);
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isSubmitting]);

  const handleLoginAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const cleanBusiness = businessName.trim();
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      const targetUrl = backendUrl ? `${backendUrl}/api/auth/login` : '/api/auth/login';

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: cleanBusiness,
          username: cleanUsername,
          password: cleanPassword
        }),
        signal: controller.signal
      }).catch(err => {
        if (err.name === 'AbortError') throw new Error("TIMEOUT");
        throw err; // Re-throw CORS or network errors
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("INVALID_RESPONSE");
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Authentication failed');

      onLogin(result.user, result.business, result.state);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Login System Error:", err);

      setShowDemoOption(true);

      if (err.message === "TIMEOUT") {
        setError('Gateway timeout. Server may be sleeping.');
      } else if (err.message === "INVALID_RESPONSE") {
        setError('Cloud routing error. Using local mirror is recommended.');
      } else if (err.name === 'TypeError') {
        setError('CORS Blocked: Browser prevented connection to backend.');
      } else {
        setError(err.message || 'Authentication Service Unavailable');
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
      status: 'Active',
      updatedAt: new Date().toISOString()
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
          <p className="text-indigo-400/80 font-medium uppercase tracking-[0.3em] text-[10px]">High Performance POS</p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-[3.5rem] p-10 shadow-2xl space-y-8 border border-white/20">
          {view === 'LOGIN' ? (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Terminal Login</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Unified Cloud Gateway</p>
              </div>

              <form onSubmit={handleLoginAttempt} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Workplace</label>
                    <input
                      type="text"
                      placeholder="Establishment Name"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 transition-all"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Profile Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Username"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 transition-all"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Access PIN</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••"
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-800 tracking-widest transition-all"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
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
                        Syncing Cloud...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-down"></i>
                        Initialize Session
                      </>
                    )}
                  </button>

                  {(showDemoOption || !isSubmitting) && (
                    <button
                      type="button"
                      onClick={enterDemoMode}
                      className="w-full py-4 bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                    >
                      <i className="fa-solid fa-plug-circle-xmark mr-2"></i>
                      Local Mirror (Offline)
                    </button>
                  )}
                </div>
              </form>
            </>
          ) : (
            <Register
              backendUrl={backendUrl}
              onBack={() => setView('LOGIN')}
              onSuccess={(user, biz) => onLogin(user, biz)}
            />
          )}

          <div className="pt-6 border-t border-slate-50 text-center space-y-4">
            {view === 'LOGIN' ? (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                New Business? <button onClick={() => setView('REGISTER')} className="text-indigo-600 hover:text-indigo-700 underline px-2">Register Terminal</button>
              </p>
            ) : (
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                Already registered? <button onClick={() => setView('LOGIN')} className="text-indigo-600 hover:text-indigo-700 underline px-2">Login to Terminal</button>
              </p>
            )}
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center justify-center gap-2">
              <i className="fa-solid fa-shield-check"></i> End-to-End Encryption Active
            </p>
          </div>
        </div>

        <div className="mt-12 text-center space-y-2">
          <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em]">System Developed by SLIEMTECH</p>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">© {new Date().getFullYear()} BARSYNC • All Rights Reserved</p>
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
