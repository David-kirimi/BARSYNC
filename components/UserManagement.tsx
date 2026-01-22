
import React, { useState } from 'react';
import { User, Role } from '../types';

interface UserManagementProps {
  users: User[];
  onAdd: (u: Omit<User, 'id' | 'businessId' | 'status'>) => void;
  onUpdate: (u: User) => void;
  onDelete: (id: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onAdd, onUpdate, onDelete }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState<Omit<User, 'id' | 'businessId' | 'status'>>({
    name: '', role: Role.BARTENDER, avatar: 'https://picsum.photos/seed/new/100/100', password: ''
  });

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Business Staff</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Assign roles and access credentials</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
        >
          Add Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-2 h-full ${u.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
            <div className="flex items-center gap-6 mb-6">
              <img src={u.avatar} alt={u.name} className="w-16 h-16 rounded-[1.5rem] shadow-lg border-4 border-slate-50" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-tight truncate">{u.name}</h3>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mt-1">{u.role}</p>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl mb-6">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Access Credential</p>
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono text-slate-600">••••••••</code>
                <span className="text-[9px] font-bold text-slate-300">Password Set</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{u.status}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onUpdate({ ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' })}
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                  title="Toggle Access"
                >
                  <i className="fa-solid fa-power-off"></i>
                </button>
                {u.role !== Role.OWNER && (
                   <button 
                    onClick={() => confirm('Remove this member? All data associated with this user will remain in logs.') && onDelete(u.id)}
                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
                    title="Delete Staff"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
            <h3 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Register New Staff</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Display Name</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold"
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Access Role</label>
                <select 
                  className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold appearance-none bg-slate-50"
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as Role})}
                >
                  <option value={Role.BARTENDER}>Bartender (Terminal Only)</option>
                  <option value={Role.ADMIN}>Business Admin (Terminal + Reports)</option>
                  <option value={Role.OWNER}>Business Owner (Full Access)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Login PIN / Password</label>
                <input 
                  type="password" 
                  className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold tracking-widest"
                  placeholder="Set Access Code"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-4 font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Dismiss</button>
                <button 
                  onClick={() => { if(!newUser.name || !newUser.password) { alert('Name and Password required'); return; } onAdd(newUser); setShowAdd(false); }} 
                  className="flex-1 py-4 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-200"
                >
                  Confirm Staff
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
