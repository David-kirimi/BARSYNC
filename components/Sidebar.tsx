
import React from 'react';
import { User, Role, View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  user: User;
  onLogout: () => void;
  offline: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user, onLogout, offline }) => {
  const menuItems = [
    { id: 'SUPER_ADMIN_PORTAL' as View, label: 'Platform Hub', icon: 'fa-server', roles: [Role.SUPER_ADMIN] },
    { id: 'POS' as View, label: 'Terminal', icon: 'fa-cash-register', roles: [Role.ADMIN, Role.BARTENDER, Role.OWNER] },
    { id: 'INVENTORY' as View, label: 'Inventory', icon: 'fa-boxes-stacked', roles: [Role.ADMIN, Role.OWNER] },
    { id: 'USER_MANAGEMENT' as View, label: 'Staff', icon: 'fa-users-gear', roles: [Role.ADMIN, Role.OWNER] },
    { id: 'AUDIT_LOGS' as View, label: 'Activity Logs', icon: 'fa-clipboard-list', roles: [Role.ADMIN, Role.OWNER, Role.SUPER_ADMIN] },
    { id: 'REPORTS' as View, label: 'Reports', icon: 'fa-file-invoice-dollar', roles: [Role.ADMIN, Role.OWNER] },
    { id: 'SALES' as View, label: 'Log', icon: 'fa-receipt', roles: [Role.ADMIN, Role.BARTENDER, Role.OWNER] },
    { id: 'ANALYTICS' as View, label: 'Stats', icon: 'fa-chart-line', roles: [Role.ADMIN, Role.OWNER] },
    { id: 'PROFILE' as View, label: 'My Profile', icon: 'fa-circle-user', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.BARTENDER, Role.OWNER] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 flex justify-around p-2 z-50 border-t border-slate-800">
        {visibleItems.slice(0, 5).map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${
              currentView === item.id ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-lg`}></i>
            <span className="text-[8px] font-black uppercase tracking-tighter mt-1">{item.label.split(' ')[0]}</span>
          </button>
        ))}
        <button onClick={onLogout} className="flex flex-col items-center p-2 text-rose-500">
          <i className="fa-solid fa-power-off text-lg"></i>
          <span className="text-[8px] font-black uppercase tracking-tighter mt-1">Exit</span>
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-950 flex-col shrink-0 border-r border-slate-800">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/20 rotate-3 cursor-pointer" onClick={() => setView('POS')}>
              <i className="fa-solid fa-beer-mug-empty"></i>
            </div>
            <div>
              <h2 className="text-white font-black text-lg tracking-tighter leading-none uppercase">BARSYNC</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Enterprise</p>
            </div>
          </div>

          <nav className="space-y-2">
            {visibleItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                  currentView === item.id 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 scale-105' 
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <i className={`fa-solid ${item.icon} text-lg w-6`}></i>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <div className="bg-slate-900/80 rounded-3xl p-5 border border-slate-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Network</span>
              <span className={`w-2.5 h-2.5 rounded-full ${offline ? 'bg-amber-500' : 'bg-emerald-500'} shadow-[0_0_12px_rgba(16,185,129,0.3)]`}></span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
              {offline ? 'Working Offline' : 'Live Sync Active'}
            </p>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-4 px-5 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xl shadow-rose-950/20 active:scale-95"
          >
            <i className="fa-solid fa-power-off"></i>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
