
import React, { useState, useMemo } from 'react';
import { AuditLog } from '../types';

interface AuditLogsProps {
  logs: AuditLog[];
}

const AuditLogs: React.FC<AuditLogsProps> = ({ logs }) => {
  const [filter, setFilter] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      log.userName.toLowerCase().includes(filter.toLowerCase()) ||
      log.action.toLowerCase().includes(filter.toLowerCase()) ||
      log.details.toLowerCase().includes(filter.toLowerCase())
    );
  }, [logs, filter]);

  const getActionColor = (action: string) => {
    if (action.includes('SALE')) return 'text-emerald-500 bg-emerald-50';
    if (action.includes('LOGIN')) return 'text-blue-500 bg-blue-50';
    if (action.includes('LOGOUT')) return 'text-slate-500 bg-slate-50';
    if (action.includes('UPDATE')) return 'text-indigo-500 bg-indigo-50';
    if (action.includes('DELETE')) return 'text-rose-500 bg-rose-50';
    return 'text-slate-400 bg-slate-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Audit Trail</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Security and activity history</p>
        </div>
        <div className="relative w-full md:w-64">
          <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input 
            type="text" 
            placeholder="Filter activities..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Time</th>
                <th className="px-6 py-5">User</th>
                <th className="px-6 py-5">Action</th>
                <th className="px-6 py-5">Activity Details</th>
                <th className="px-8 py-5 text-right">Identifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <i className="fa-solid fa-ghost text-4xl text-slate-100 mb-4"></i>
                      <p className="text-slate-300 font-black uppercase text-[10px] tracking-widest">No logs match your criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <p className="text-[11px] font-black text-slate-800">{new Date(log.timestamp).toLocaleDateString()}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-xs font-black text-slate-700 uppercase">{log.userName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-medium text-slate-600 max-w-xs truncate" title={log.details}>
                        {log.details}
                      </p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <code className="text-[9px] font-mono font-bold text-slate-300 uppercase">{log.id}</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
