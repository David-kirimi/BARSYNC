import React from 'react';
import { Sale } from '../types';

interface BarKitchenDisplayProps {
  sales: Sale[];
  onUpdateStatus: (saleId: string, status: Sale['status']) => void;
}

const BarKitchenDisplay: React.FC<BarKitchenDisplayProps> = ({ sales, onUpdateStatus }) => {
  // Filter for orders that need prep (PENDING_PAYMENT, PREPARING, READY)
  const activeOrders = sales.filter(s => 
    s.status === 'PENDING_PAYMENT' || 
    s.status === 'PREPARING' || 
    s.status === 'READY'
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pending = activeOrders.filter(o => o.status === 'PENDING_PAYMENT');
  const preparing = activeOrders.filter(o => o.status === 'PREPARING');
  const ready = activeOrders.filter(o => o.status === 'READY');

  const OrderCard = ({ order }: { order: Sale }) => (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl">
      <div className={`absolute top-0 left-0 w-2 h-full transition-all group-hover:w-4 ${
        order.status === 'PENDING_PAYMENT' ? 'bg-amber-400' : 
        order.status === 'PREPARING' ? 'bg-indigo-500' : 'bg-emerald-500'
      }`}></div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h4 className="font-black text-slate-800 text-2xl tracking-tighter uppercase leading-none mb-1">TICKET #{order.ticketNumber}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <i className="fa-solid fa-user-tag text-indigo-400"></i> {order.created_by_waiter || 'Unknown'}
          </p>
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="flex-1 space-y-3 mb-8 border-y border-slate-50 py-6">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-3 rounded-2xl">
            <span className="text-sm font-black text-slate-700 uppercase">{item.quantity}x {item.name}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {order.status === 'PENDING_PAYMENT' && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'PREPARING')}
            className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <i className="fa-solid fa-play"></i> Start Preparing
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button 
            onClick={() => onUpdateStatus(order.id, 'READY')}
            className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            <i className="fa-solid fa-check-double"></i> Mark Ready
          </button>
        )}
        {order.status === 'READY' && (
          <div className="py-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest text-center border border-emerald-100 animate-pulse">
            Waiting for Pickup
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-10 shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Kitchen Display</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-3 font-mono">
            {activeOrders.length} Active Orders • Live Fulfillment Monitor
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-slate-100 shadow-sm">
          <div className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden">
        {/* NEW / PENDING */}
        <div className="flex flex-col h-full bg-slate-50/50 rounded-[3rem] border border-slate-200/50 p-6">
          <div className="flex items-center justify-between mb-6 px-4">
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span> Incoming Orders ({pending.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 no-scrollbar">
            {pending.map(order => (
              <div key={order.id}>
                <OrderCard order={order} />
              </div>
            ))}
            {pending.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40 py-20">
                <i className="fa-solid fa-hourglass text-5xl mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">No New Tickets</p>
              </div>
            )}
          </div>
        </div>

        {/* PREPARING */}
        <div className="flex flex-col h-full bg-indigo-50/30 rounded-[3rem] border border-indigo-100/30 p-6">
          <div className="flex items-center justify-between mb-6 px-4">
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span> In Preparation ({preparing.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 no-scrollbar">
            {preparing.map(order => (
              <div key={order.id}>
                <OrderCard order={order} />
              </div>
            ))}
            {preparing.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40 py-20">
                <i className="fa-solid fa-fire text-5xl mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">Bar is clear</p>
              </div>
            )}
          </div>
        </div>

        {/* READY FOR PICKUP */}
        <div className="flex flex-col h-full bg-emerald-50/30 rounded-[3rem] border border-emerald-100/30 p-6 text-center">
          <div className="flex items-center justify-between mb-6 px-4 text-left">
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Ready for Pickup ({ready.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 no-scrollbar text-left">
            {ready.map(order => (
              <div key={order.id}>
                <OrderCard order={order} />
              </div>
            ))}
            {ready.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40 py-20">
                <i className="fa-solid fa-bell-concierge text-5xl mb-4"></i>
                <p className="text-[10px] font-black uppercase tracking-widest">Counter is clear</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarKitchenDisplay;
