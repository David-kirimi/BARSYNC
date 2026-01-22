
import React from 'react';
import { User, Role, View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  user: User;
  onLogout: () => void;
  offline: boolean;
  onSync: () => void;
  isSyncing: boolean;
  lastSync: string | null;
  backendAlive: boolean;
  canInstall?: boolean;
  onInstall?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, user, onLogout, offline, onSync, isSyncing, lastSync, backendAlive, canInstall, onInstall, mobileOpen, onMobileClose }) => {
  const menuItems = [
    { id: 'SUPER_ADMIN_PORTAL' as View, label: 'Platform Hub', icon: 'fa-server', roles: [Role.SUPER_ADMIN] },
    { id: 'POS' as View, label: 'Terminal', icon: 'fa-cash-register', roles: [Role.ADMIN, Role.BARTENDER, Role.OWNER] },
    { id: 'INVENTORY' as View, label: 'Inventory', icon: 'fa-boxes-stacked', roles: [Role.ADMIN, Role.OWNER] },
    { id: 'USER_MANAGEMENT' as View, label: 'Staff Hub', icon: 'fa-users-gear', roles: [Role.ADMIN, Role.OWNER] },
    { id: 'AUDIT_LOGS' as View, label: 'Audit Trail', icon: 'fa-shield-halved', roles: [Role.ADMIN, Role.OWNER, Role.SUPER_ADMIN] },
    { id: 'REPORTS' as View, label: 'BI Reports', icon: 'fa-file-invoice-dollar', roles: [Role.ADMIN, Role.OWNER] },
    { id: 'SALES' as View, label: 'Sales Log', icon: 'fa-receipt', roles: [Role.ADMIN, Role.BARTENDER, Role.OWNER] },
    { id: 'ANALYTICS' as View, label: 'BI Stats', icon: 'fa-chart-line', roles: [Role.ADMIN, Role.OWNER] },
    { id: 'SUBSCRIPTION' as View, label: 'Activation', icon: 'fa-credit-card', roles: [Role.ADMIN, Role.OWNER] },
    { id: 'PROFILE' as View, label: 'Account', icon: 'fa-circle-user', roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.BARTENDER, Role.OWNER] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-slate-950 z-50 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img src={user.avatar} className="w-12 h-12 rounded-2xl shadow-lg" alt="" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-white truncate">{user.name}</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {visibleItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${currentView === item.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
              >
                <i className={`fa-solid ${item.icon} text-lg w-5`}></i>
                <span className="text-sm font-black uppercase tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-slate-800">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 transition-all active:scale-95"
            >
              <i className="fa-solid fa-power-off text-lg w-5"></i>
              <span className="text-sm font-black uppercase tracking-tight">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav (kept for quick access) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950 flex justify-around p-2 z-50 border-t border-slate-800">
        {visibleItems.slice(0, 5).map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center p-2 rounded-xl transition-all ${currentView === item.id ? 'text-indigo-400' : 'text-slate-500'
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

      <aside className="hidden md:flex w-64 bg-slate-950 flex-col shrink-0 border-r border-slate-800 overflow-y-auto no-scrollbar">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/20 rotate-3 cursor-pointer" onClick={() => setView('POS')}>
              <i className="fa-solid fa-beer-mug-empty"></i>
            </div>
            <div>
              <h2 className="text-white font-black text-lg tracking-tighter leading-none uppercase">BARSYNC</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Full Stack Mode</p>
            </div>
          </div>

          <nav className="space-y-2">
            {visibleItems.map(item => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${currentView === item.id
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
          <div className="bg-slate-900/80 rounded-3xl p-5 border border-slate-800 backdrop-blur-sm shadow-inner">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-server text-[8px]"></i> Backend API
                </span>
                <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${backendAlive ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                  {backendAlive ? 'Driver Ready' : 'Backend Down'}
                </span>
              </div>
              <button
                onClick={onSync}
                disabled={isSyncing || !backendAlive}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSyncing ? 'bg-indigo-500 text-white animate-spin' : 'bg-slate-800 text-slate-400 hover:text-indigo-400'}`}
                title="Force Cloud Sync"
              >
                <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Network</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${offline ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">
                    {offline ? 'OFFLINE' : 'ONLINE'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[9px] text-slate-400 font-bold uppercase">Last Mirror</p>
                <p className="text-[8px] font-black text-indigo-400 uppercase">
                  {lastSync ? lastSync.split(',')[1] : 'Never'}
                </p>
              </div>
            </div>
          </div>

          {canInstall && (
            <button
              onClick={onInstall}
              className="w-full flex items-center justify-center gap-4 px-5 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-950/20 active:scale-95"
            >
              <i className="fa-solid fa-mobile-screen-button"></i>
              Install App
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-4 px-5 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xl shadow-rose-950/20 active:scale-95"
          >
            <i className="fa-solid fa-power-off"></i>
            Exit POS
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
