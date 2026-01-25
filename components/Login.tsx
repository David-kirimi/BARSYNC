
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
  const [view, setView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const handleLoginAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const targetUrl = backendUrl ? `${backendUrl}/api/auth/login` : '/api/auth/login';

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          username: username.trim(),
          password: password.trim()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid server response");
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Authentication failed');

      if (result.user.status !== 'Active') {
        throw new Error("Access Revoked: Account Deactivated");
      }

      onLogin(result.user, result.business, result.state);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Login Error:", err);
      if (err.name === 'AbortError') {
        setError('Gateway timeout. Server may be sleeping.');
      } else {
        setError(err.message || 'Authentication Service Unavailable');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-orange-400 via-white to-orange-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-orange-600 rounded-[2rem] flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-2xl shadow-orange-600/40 rotate-12">
            <i className="fa-solid fa-beer-mug-empty"></i>
          </div>
          <h1 className="text-4xl font-black text-orange-900 mb-2 tracking-tighter uppercase">BARSYNC</h1>
          <p className="text-orange-600/80 font-medium uppercase tracking-[0.3em] text-[10px]">High Performance POS</p>
        </div>

        <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl space-y-8 border border-orange-100">
          {view === 'LOGIN' ? (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Terminal Login</h2>
                <p className="text-orange-600 text-[10px] font-bold uppercase tracking-widest mt-1">Cloud Synchronization Active</p>
              </div>

              <form onSubmit={handleLoginAttempt} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Workplace</label>
                    <input
                      type="text"
                      placeholder="Establishment Name"
                      className="w-full px-6 py-4 bg-orange-50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 font-bold text-slate-800 transition-all"
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Profile Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Username"
                      className="w-full px-6 py-4 bg-orange-50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 font-bold text-slate-800 transition-all"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2 z-10">Access PIN</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••"
                      className="w-full px-6 py-4 bg-orange-50 border border-orange-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 font-bold text-slate-800 tracking-widest transition-all"
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
                    className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <>
                        <i className="fa-solid fa-circle-notch animate-spin"></i>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-down"></i>
                        Initialize Session
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="pt-6 border-t border-orange-50 text-center space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">
                  New Business? <button onClick={() => setView('REGISTER')} className="text-orange-600 hover:text-orange-700 underline px-2">Register Terminal</button>
                </p>
                <p className="text-[9px] font-black text-orange-300 uppercase tracking-widest flex items-center justify-center gap-2">
                  <i className="fa-solid fa-shield-check"></i> End-to-End Encryption Active
                </p>
              </div>
            </>
          ) : (
            <Register
              backendUrl={backendUrl}
              onBack={() => setView('LOGIN')}
              onSuccess={(user, biz) => onLogin(user, biz)}
            />
          )}

          <div className="mt-12 text-center space-y-2">
            <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-[0.3em]">System Developed by SLIEMTECH</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">© {new Date().getFullYear()} BARSYNC • All Rights Reserved</p>
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
