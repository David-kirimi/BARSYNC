import React from 'react';
import { Sale } from '../types';

interface BarKitchenDisplayProps {
  sales: Sale[];
  onUpdateStatus: (saleId: string, status: Sale['status']) => void;
}

const BarKitchenDisplay: React.FC<BarKitchenDisplayProps> = ({ sales, onUpdateStatus }) => {
  // Filter for orders that need prep (PENDING_PAYMENT, PREPARING, READY)
  // Also filter out mock Ticket #1 to keep display clean
  const activeOrders = sales.filter(s => 
    (s.status === 'PENDING_PAYMENT' || 
     s.status === 'PREPARING' || 
     s.status === 'READY') &&
    s.ticketNumber !== 1
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pending = activeOrders.filter(o => o.status === 'PENDING_PAYMENT');
  const preparing = activeOrders.filter(o => o.status === 'PREPARING');
  const ready = activeOrders.filter(o => o.status === 'READY');

  const OrderCard = ({ order }: { order: Sale }) => (
    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col group relative overflow-hidden transition-all hover:shadow-lg h-auto max-h-[400px]">
      <div className={`absolute top-0 left-0 w-1 h-full transition-all group-hover:w-2 ${
        order.status === 'PENDING_PAYMENT' ? 'bg-amber-400' : 
        order.status === 'PREPARING' ? 'bg-indigo-500' : 'bg-emerald-500'
      }`}></div>
      
      <div className="p-4 pb-3 border-b border-slate-50 shrink-0">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-black text-slate-800 text-lg tracking-tighter uppercase leading-none">TICKET #{order.ticketNumber}</h4>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <i className="fa-solid fa-user-tag text-indigo-400 text-[7px]"></i> {order.created_by_waiter || 'Unknown'}
        </p>
        {(order.status === 'PREPARING' || order.status === 'READY') && order.prepared_by_bar && (
          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
            <i className="fa-solid fa-fire-burner text-[7px]"></i> {order.prepared_by_bar}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar bg-slate-50/20">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100/50">
            <span className="text-[11px] font-black text-slate-700 uppercase leading-none">{item.quantity}x {item.name}</span>
          </div>
        ))}
      </div>

      <div className="p-4 pt-3 border-t border-slate-50 shrink-0">
        {order.status === 'PENDING_PAYMENT' && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'PREPARING')}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-play"></i> Start
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'READY')}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-check"></i> Ready
          </button>
        )}
        {order.status === 'READY' && (
          <div className="py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[8px] uppercase tracking-widest text-center border border-emerald-100 animate-pulse">
            Ready for Pickup
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Kitchen Display</h2>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1.5 font-mono">
            {activeOrders.length} Tickets • {pending.length} New • {preparing.length} Active
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl flex items-center gap-2 border border-indigo-100">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
            <span className="text-[9px] font-black uppercase tracking-widest">Live Node</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden min-h-0">
        {/* NEW / PENDING */}
        <div className="flex-1 flex flex-col min-h-0 bg-white/40 rounded-[2rem] border border-slate-200/50 overflow-hidden shadow-inner">
          <div className="p-4 pb-2 shrink-0">
            <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 px-2">
              <i className="fa-solid fa-fire text-amber-400"></i> Incoming ({pending.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {pending.map(order => (
              <div key={order.id}>
                <OrderCard order={order} />
              </div>
            ))}
            {pending.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-40">
                <i className="fa-solid fa-hourglass text-3xl mb-2"></i>
                <p className="text-[8px] font-black uppercase tracking-widest">Waiting</p>
              </div>
            )}
          </div>
        </div>

        {/* PREPARING */}
        <div className="flex-1 flex flex-col min-h-0 bg-indigo-50/20 rounded-[2rem] border border-indigo-100/30 overflow-hidden shadow-inner">
          <div className="p-4 pb-2 shrink-0">
            <h3 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 px-2">
              <i className="fa-solid fa-whiskey-glass text-indigo-400"></i> Preparing ({preparing.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {preparing.map(order => (
              <div key={order.id}>
                <OrderCard order={order} />
              </div>
            ))}
            {preparing.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-40">
                <i className="fa-solid fa-glass-water text-3xl mb-2"></i>
                <p className="text-[8px] font-black uppercase tracking-widest">Clear</p>
              </div>
            )}
          </div>
        </div>

        {/* READY FOR PICKUP */}
        <div className="flex-1 flex flex-col min-h-0 bg-emerald-50/20 rounded-[2rem] border border-emerald-100/30 overflow-hidden shadow-inner">
          <div className="p-4 pb-2 shrink-0">
            <h3 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 px-2">
              <i className="fa-solid fa-circle-check text-emerald-500"></i> Ready ({ready.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {ready.map(order => (
              <div key={order.id}>
                <OrderCard order={order} />
              </div>
            ))}
            {ready.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-40">
                <i className="fa-solid fa-bell-concierge text-3xl mb-2"></i>
                <p className="text-[8px] font-black uppercase tracking-widest">Empty</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarKitchenDisplay;
