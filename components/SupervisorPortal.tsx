import React, { useMemo } from 'react';
import { Sale, StaffLog, Role, User } from '../types';

interface SupervisorPortalProps {
  sales: Sale[];
  staffLogs: StaffLog[];
  businessName: string;
  onUpdateRole: (userId: string, newRole: Role) => void;
  users?: User[];
}

const SupervisorPortal: React.FC<SupervisorPortalProps> = ({ sales, staffLogs, businessName, onUpdateRole, users = [] }) => {
  // 1. Staff Sign in/out Log
  const sortedLogs = useMemo(() => {
    return [...staffLogs].sort((a, b) => new Date(b.signInTime).getTime() - new Date(a.signInTime).getTime());
  }, [staffLogs]);

  // 2. Active Staff: staff who have a log entry with no sign-out time
  // This is the accurate count — only people who are genuinely signed in.
  const activeStaff = useMemo(() => {
    return staffLogs.filter(log => !log.signOutTime);
  }, [staffLogs]);

  // 3. Quick Stats (Today's figures)
  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = sales.filter(s => new Date(s.date) >= today);
    const completed = todaySales.filter(s => s.status === 'COMPLETED');
    const pending = todaySales.filter(s => s.status === 'PENDING_PAYMENT');

    const totalValue = completed.reduce((sum, s) => sum + s.totalAmount, 0);
    const pendingValue = pending.reduce((sum, s) => sum + s.totalAmount, 0);

    return {
      completedCount: completed.length,
      pendingCount: pending.length,
      totalValue,
      pendingValue
    };
  }, [sales]);

  return (
    <div className="flex h-full flex-col gap-6 pb-20 lg:pb-0 min-h-0">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl shrink-0 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">Sup. Portal</h2>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{businessName} • Floor Management</p>
        </div>
        
        <div className="flex gap-4 lg:gap-8 relative z-10 w-full lg:w-auto overflow-x-auto no-scrollbar pb-2 lg:pb-0">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cleared Value</p>
            <p className="text-2xl font-black text-white tracking-tighter">Ksh {todayStats.totalValue.toLocaleString()}</p>
          </div>
          <div className="w-px bg-slate-800"></div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">At Risk (Pending)</p>
            <p className="text-2xl font-black text-rose-400 tracking-tighter">Ksh {todayStats.pendingValue.toLocaleString()}</p>
          </div>
          <div className="w-px bg-slate-800"></div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Staff</p>
            <p className="text-2xl font-black text-emerald-400 tracking-tighter">{activeStaff.length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* LEFT COLUMN - ACTIVE STAFF & QUICK ACTIVITY */}
        <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex-1 flex flex-col min-h-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              Who is on the floor?
              <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full">{activeStaff.length} Active</span>
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 no-scrollbar">
              {activeStaff.map(staff => (
                <div key={staff.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                   <div className="w-10 h-10 rounded-2xl bg-white text-slate-800 flex items-center justify-center font-black text-xs uppercase shadow-sm border border-slate-100">
                    {staff.userName.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-slate-800 uppercase truncate">{staff.userName}</p>
                    <select 
                      className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-transparent border-none outline-none cursor-pointer hover:bg-indigo-50 rounded px-1 transition-colors"
                      value={staff.role}
                      onChange={(e) => onUpdateRole(staff.userId, e.target.value as Role)}
                    >
                      {Object.values(Role).map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black bg-emerald-50 text-emerald-500 px-2 py-1 rounded-full uppercase tracking-widest border border-emerald-100">Active</span>
                  </div>
                </div>
              ))}
              {activeStaff.length === 0 && (
                <div className="text-center py-10 text-slate-300">
                  <i className="fa-solid fa-users-slash text-3xl mb-3 opacity-20"></i>
                  <p className="font-bold text-[10px] uppercase tracking-widest">No staff clocked in</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-[2.5rem] p-6 border border-orange-100 shadow-sm flex flex-col shrink-0">
             <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Order Activity (Today)</h3>
             <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-white p-4 rounded-2xl border border-orange-100/50 text-center shadow-sm">
                  <p className="text-3xl font-black text-slate-800">{todayStats.completedCount}</p>
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1">Completed</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-orange-100/50 text-center shadow-sm">
                  <p className="text-3xl font-black text-rose-500">{todayStats.pendingCount}</p>
                  <p className="text-[8px] font-black text-rose-400 uppercase tracking-[0.2em] mt-1">Pending Auth</p>
                </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN - STAFF LOGS */}
        <div className="flex-1 bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Time & Attendance Log</h3>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl">
              Chronological
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 space-y-3 no-scrollbar relative">
            {/* Timeline Line */}
            <div className="absolute top-4 bottom-4 left-[27px] w-0.5 bg-slate-100 hidden sm:block"></div>
            
            {sortedLogs.map((log) => (
              <div key={log.id} className="relative pl-0 sm:pl-16">
                {/* Timeline Dot */}
                <div className="absolute left-[24px] top-4 w-2 h-2 rounded-full hidden sm:block bg-indigo-200 border-2 border-white ring-4 ring-white"></div>
                
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-100 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-[13px] text-slate-800 uppercase">{log.userName}</span>
                      <span className="text-[8px] font-black bg-white text-slate-500 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-widest">{log.role}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span><i className="fa-solid fa-arrow-right-to-bracket text-emerald-400 mr-1"></i> IN: {new Date(log.signInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {log.signOutTime && (
                        <span><i className="fa-solid fa-arrow-right-from-bracket text-rose-400 mr-1"></i> OUT: {new Date(log.signOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-black text-slate-500 mb-1">{new Date(log.signInTime).toLocaleDateString()}</div>
                    {!log.signOutTime && (
                       <span className="text-[8px] font-black bg-indigo-50 text-indigo-500 px-2 py-1 rounded inline-block uppercase tracking-widest">Currently Shifted</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {sortedLogs.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                <i className="fa-regular fa-clock text-5xl mb-4 opacity-20"></i>
                <p className="font-black uppercase tracking-widest text-[10px]">No attendance records</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SupervisorPortal;
