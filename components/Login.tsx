
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [displayUsers, setDisplayUsers] = useState<User[]>([]);

  useEffect(() => {
    const savedUsers = localStorage.getItem('bar_pos_all_users');
    if (savedUsers) {
      setDisplayUsers(JSON.parse(savedUsers));
    } else {
      // Fallback if App.tsx hasn't initialized storage yet
      setDisplayUsers([
        { id: '1', name: 'Jeniffer', role: Role.BARTENDER, avatar: 'https://picsum.photos/seed/jen/100/100', businessId: 'bus_1', status: 'Active', password: '123' },
        { id: '2', name: 'Winnie Admin', role: Role.ADMIN, avatar: 'https://picsum.photos/seed/win/100/100', businessId: 'bus_1', status: 'Active', password: '123' },
        { id: 'super_1', name: 'Platform Owner', role: Role.SUPER_ADMIN, avatar: 'https://picsum.photos/seed/owner/100/100', status: 'Active', password: 'admin' },
      ]);
    }
  }, []);

  const handleLoginAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    // Safety check: if for some reason password is still undefined in storage
    const storedPassword = selectedUser.password || (selectedUser.role === Role.SUPER_ADMIN ? 'admin' : '123');
    
    if (storedPassword === password) {
      onLogin({ ...selectedUser, password: storedPassword });
    } else {
      setError('Invalid password. Please try again.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-indigo-500 rounded-[2rem] flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-2xl shadow-indigo-500/40 rotate-12">
            <i className="fa-solid fa-beer-mug-empty"></i>
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">BARSYNC</h1>
          <p className="text-indigo-400/80 font-medium uppercase tracking-[0.3em] text-[10px]">Secure Terminal Access</p>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-[2.5rem] p-10 shadow-2xl space-y-8 border border-white/20">
          {!selectedUser ? (
            <>
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Select Profile</h2>
                <p className="text-slate-500 text-sm mt-1">Select your profile to sign in</p>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 no-scrollbar">
                {displayUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center gap-4 p-4 border border-slate-100 rounded-3xl hover:bg-white hover:shadow-xl hover:border-indigo-200 transition-all text-left group"
                  >
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-xl shadow-sm" />
                    <div className="flex-1">
                      <p className="font-black text-slate-800 uppercase text-xs">{user.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</p>
                    </div>
                    <i className="fa-solid fa-chevron-right text-slate-300"></i>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleLoginAttempt} className="space-y-6">
              <button 
                type="button" 
                onClick={() => { setSelectedUser(null); setError(''); setPassword(''); }}
                className="text-indigo-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-indigo-700 transition-colors"
              >
                <i className="fa-solid fa-arrow-left"></i> Change User
              </button>
              
              <div className="text-center">
                <img src={selectedUser.avatar} className="w-20 h-20 rounded-3xl mx-auto mb-4 shadow-xl border-4 border-white" />
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selectedUser.name}</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{selectedUser.role}</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="password"
                    placeholder="Enter PIN / Password"
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold tracking-widest text-center"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                  />
                </div>
                {error && <p className="text-rose-500 text-[10px] font-bold text-center uppercase tracking-widest">{error}</p>}
                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  Enter Terminal
                </button>
              </div>
            </form>
          )}

          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
               <i className="fa-solid fa-shield-halved"></i> Biometric Auth Disabled
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
