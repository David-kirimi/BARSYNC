import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sale, Role, Shift } from '../types';

interface BarKitchenDisplayProps {
  currentShift: Shift | null;
  sales: Sale[];
  onUpdateStatus: (saleId: string, status: Sale['status']) => void;
}

const OrderCard: React.FC<{
  order: Sale,
  isExpanded: boolean,
  onToggle: () => void,
  onUpdateStatus: (id: string, status: Sale['status']) => void
}> = ({ order, isExpanded, onToggle, onUpdateStatus }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col group relative overflow-hidden transition-all hover:shadow-lg h-auto"
    >
      <div className={`absolute top-0 left-0 w-1 h-full transition-all group-hover:w-2 ${
        order.status === 'PENDING_PAYMENT' ? 'bg-amber-400' : 
        order.status === 'PREPARING' ? 'bg-indigo-500' : 'bg-emerald-500'
      }`}></div>
      
      <div 
        className="p-4 pb-3 border-b border-slate-50 shrink-0 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-black text-slate-800 text-lg tracking-tighter uppercase leading-none">TICKET #{order.ticketNumber}</h4>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <i className={`fa-solid fa-chevron-down text-[8px] text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} lg:hidden`}></i>
          </div>
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

      {/* Desktop Content */}
      <div className="hidden lg:block flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar bg-slate-50/20 max-h-[250px]">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100/50">
                <span className="text-[11px] font-black text-slate-700 uppercase leading-none">{item.quantity}x {item.name}</span>
              </div>
            ))}
          </div>

          <div className="p-4 pt-3 border-t border-slate-50 shrink-0">
            {order.status === 'PENDING_PAYMENT' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'PREPARING'); }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-play"></i> Start
              </button>
            )}
            {order.status === 'PREPARING' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'READY'); }}
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

      {/* Mobile Content */}
      <div className="lg:hidden flex-1 overflow-hidden">
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col"
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-1.5 no-scrollbar bg-slate-50/20 max-h-[250px]">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100/50">
                    <span className="text-[11px] font-black text-slate-700 uppercase leading-none">{item.quantity}x {item.name}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 pt-3 border-t border-slate-50 shrink-0">
                {order.status === 'PENDING_PAYMENT' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'PREPARING'); }}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-play"></i> Start
                  </button>
                )}
                {order.status === 'PREPARING' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'READY'); }}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const BarKitchenDisplay: React.FC<BarKitchenDisplayProps> = ({ currentShift, sales, onUpdateStatus }) => {
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

  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [activeSubView, setActiveSubView] = useState<'pending' | 'preparing' | 'ready' | null>(null);

  const toggleOrder = (id: string) => setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleColumn = (col: string) => setCollapsedColumns(prev => ({ ...prev, [col]: !prev[col] }));

  return (
    <div className="flex flex-col h-full bg-slate-50/30 overflow-hidden relative">
      <AnimatePresence>
        {activeSubView === 'pending' && (
          <SubViewPortal 
            title="Incoming Orders" 
            orders={pending} 
            onBack={() => setActiveSubView(null)} 
            colorClass="text-amber-500"
            onUpdateStatus={onUpdateStatus}
          />
        )}
        {activeSubView === 'preparing' && (
          <SubViewPortal 
            title="Orders in Prep" 
            orders={preparing} 
            onBack={() => setActiveSubView(null)} 
            colorClass="text-indigo-600"
            onUpdateStatus={onUpdateStatus}
          />
        )}
        {activeSubView === 'ready' && (
          <SubViewPortal 
            title="Collection Queue" 
            orders={ready} 
            onBack={() => setActiveSubView(null)} 
            colorClass="text-emerald-600"
            onUpdateStatus={onUpdateStatus}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 shrink-0 gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Kitchen Display</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2 font-mono">
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
        <div className={`flex flex-col min-h-0 bg-white/40 rounded-[2rem] border border-slate-200/50 overflow-hidden shadow-inner transition-all duration-500 ${collapsedColumns['pending'] ? 'flex-none h-16 lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <div 
            className="p-4 py-5 shrink-0 cursor-pointer lg:cursor-default active:opacity-60 transition-opacity"
            onClick={() => window.innerWidth < 1024 ? setActiveSubView('pending') : toggleColumn('pending')}
          >
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center justify-between px-2">
              <span className="flex items-center gap-2"><i className="fa-solid fa-fire text-amber-400"></i> Incoming ({pending.length})</span>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-arrow-right text-[10px] text-amber-300 lg:hidden"></i>
                <i className={`fa-solid fa-chevron-down lg:hidden transition-transform ${collapsedColumns['pending'] ? '' : 'rotate-180'} hidden`}></i>
              </div>
            </h3>
          </div>
          <motion.div 
            animate={{ height: collapsedColumns['pending'] ? 0 : 'auto', opacity: collapsedColumns['pending'] ? 0 : 1 }}
            className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar lg:!h-auto lg:!opacity-100"
          >
            <AnimatePresence mode="popLayout">
              {pending.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isExpanded={!!expandedOrders[order.id]}
                  onToggle={() => toggleOrder(order.id)}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}
            </AnimatePresence>
            {pending.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-40">
                <i className="fa-solid fa-hourglass text-3xl mb-2"></i>
                <p className="text-[8px] font-black uppercase tracking-widest">Waiting</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* PREPARING */}
        <div className={`flex flex-col min-h-0 bg-indigo-50/20 rounded-[2rem] border border-indigo-100/30 overflow-hidden shadow-inner transition-all duration-500 ${collapsedColumns['preparing'] ? 'flex-none h-16 lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <div 
            className="p-4 py-5 shrink-0 cursor-pointer lg:cursor-default active:opacity-60 transition-opacity"
            onClick={() => window.innerWidth < 1024 ? setActiveSubView('preparing') : toggleColumn('preparing')}
          >
            <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-between px-2">
              <span className="flex items-center gap-2"><i className="fa-solid fa-whiskey-glass text-indigo-400"></i> Preparing ({preparing.length})</span>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-arrow-right text-[10px] text-indigo-300 lg:hidden"></i>
                <i className={`fa-solid fa-chevron-down lg:hidden transition-transform ${collapsedColumns['preparing'] ? '' : 'rotate-180'} hidden`}></i>
              </div>
            </h3>
          </div>
          <motion.div 
            animate={{ height: collapsedColumns['preparing'] ? 0 : 'auto', opacity: collapsedColumns['preparing'] ? 0 : 1 }}
            className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar lg:!h-auto lg:!opacity-100"
          >
            <AnimatePresence mode="popLayout">
              {preparing.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isExpanded={!!expandedOrders[order.id]}
                  onToggle={() => toggleOrder(order.id)}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}
            </AnimatePresence>
            {preparing.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-40">
                <i className="fa-solid fa-glass-water text-3xl mb-2"></i>
                <p className="text-[8px] font-black uppercase tracking-widest">Clear</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* READY FOR PICKUP */}
        <div className={`flex flex-col min-h-0 bg-emerald-50/20 rounded-[2rem] border border-emerald-100/30 overflow-hidden shadow-inner transition-all duration-500 ${collapsedColumns['ready'] ? 'flex-none h-16 lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <div 
            className="p-4 py-5 shrink-0 cursor-pointer lg:cursor-default active:opacity-60 transition-opacity"
            onClick={() => window.innerWidth < 1024 ? setActiveSubView('ready') : toggleColumn('ready')}
          >
            <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center justify-between px-2">
              <span className="flex items-center gap-2"><i className="fa-solid fa-circle-check text-emerald-500"></i> Ready ({ready.length})</span>
              <div className="flex items-center gap-3">
                <i className="fa-solid fa-arrow-right text-[10px] text-emerald-300 lg:hidden"></i>
                <i className={`fa-solid fa-chevron-down lg:hidden transition-transform ${collapsedColumns['ready'] ? '' : 'rotate-180'} hidden`}></i>
              </div>
            </h3>
          </div>
          <motion.div 
            animate={{ height: collapsedColumns['ready'] ? 0 : 'auto', opacity: collapsedColumns['ready'] ? 0 : 1 }}
            className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar lg:!h-auto lg:!opacity-100"
          >
            <AnimatePresence mode="popLayout">
              {ready.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isExpanded={!!expandedOrders[order.id]}
                  onToggle={() => toggleOrder(order.id)}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}
            </AnimatePresence>
            {ready.length === 0 && (
              <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-40">
                <i className="fa-solid fa-bell-concierge text-3xl mb-2"></i>
                <p className="text-[8px] font-black uppercase tracking-widest">Empty</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      {/* NO SHIFT OVERLAY */}
      {!currentShift && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center rounded-[3rem]">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-xl">
            <i className="fa-solid fa-lock text-3xl text-rose-500"></i>
          </div>
          <h2 className="text-3xl lg:text-5xl font-black text-slate-800 tracking-tighter uppercase mb-4">No Active Shift</h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-sm mb-8">
            Please start a shift on the Terminal before processing orders.
          </p>
        </div>
      )}
    </div>
  );
};

const SubViewPortal: React.FC<{
  title: string,
  orders: Sale[],
  onBack: () => void,
  colorClass: string,
  onUpdateStatus: (id: string, status: Sale['status']) => void
}> = ({ title, orders, onBack, colorClass, onUpdateStatus }) => {
  return (
    <motion.div 
      initial={{ x: '100vw' }}
      animate={{ x: 0 }}
      exit={{ x: '100vw' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-slate-50 z-[200] flex flex-col overflow-hidden"
    >
      <div className="p-6 bg-white border-b border-slate-100 flex items-center gap-6 shrink-0">
        <button 
          onClick={onBack} 
          className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-all shadow-sm"
        >
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tight leading-none ${colorClass}`}>{title}</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{orders.length} ACTIVE TICKETS</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-scrollbar pb-32">
        <AnimatePresence mode="popLayout">
          {orders.map(order => (
            <OrderCard 
              key={order.id}
              order={order}
              isExpanded={true}
              onToggle={() => {}}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </AnimatePresence>
        {orders.length === 0 && (
          <div className="col-span-full h-96 flex flex-col items-center justify-center text-slate-300 opacity-60">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
              <i className="fa-solid fa-check-double text-4xl text-slate-200"></i>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.3em]">All Clear</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default BarKitchenDisplay;
