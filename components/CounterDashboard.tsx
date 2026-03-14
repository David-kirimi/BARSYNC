import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sale, StaffLog, Role } from '../types';

interface CounterDashboardProps {
  sales: Sale[];
  staffLogs: StaffLog[];
  onVerifyPayment: (saleId: string, method: 'Cash' | 'Mpesa', mpesaCode?: string) => Promise<void>;
  onUpdateStatus: (saleId: string, status: Sale['status']) => void;
  onCancelOrder: (saleId: string) => Promise<void>;
  onSwitchView: (v: any) => void;
}

const CounterDashboard: React.FC<CounterDashboardProps> = ({ 
  sales, staffLogs, onVerifyPayment, onUpdateStatus, onCancelOrder, onSwitchView 
}) => {
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [mpesaCodeInput, setMpesaCodeInput] = useState('');
  const [mpesaError, setMpesaError] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleOrder = (id: string) => setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleSection = (sec: string) => setCollapsedSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  // 1. Pending / In Prep (anything before READY)
  const pendingOrders = sales.filter(s => 
    (s.status === 'PENDING_PAYMENT' || s.status === 'PREPARING') && 
    (ticketSearch === '' || s.ticketNumber?.toString().includes(ticketSearch)) &&
    s.ticketNumber !== 1
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 2. Ready for Pickup (status === 'READY')
  const readyOrders = sales.filter(s => 
    s.status === 'READY' && 
    (ticketSearch === '' || s.ticketNumber?.toString().includes(ticketSearch)) &&
    s.ticketNumber !== 1
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 3. Served (Waiters have them, waiting for payment)
  const servedOrders = sales.filter(s => s.status === 'SERVED' && s.ticketNumber !== 1);

  // 4. Recently Completed Today
  const completedOrders = sales.filter(s => s.status === 'COMPLETED').slice(0, 10);

  const handleVerifyCash = async (saleId: string) => {
    await onVerifyPayment(saleId, 'Cash');
  };

  const handleStartMpesaVerify = (saleId: string) => {
    setSelectedSaleId(saleId);
    setMpesaCodeInput('');
    setMpesaError('');
    setShowMpesaModal(true);
  };

  const handleConfirmMpesaVerify = async () => {
    if (!selectedSaleId) return;
    const code = mpesaCodeInput.trim().toUpperCase();
    if (code.length < 8 || code.length > 12) {
      setMpesaError("Code must be 8-12 characters");
      return;
    }
    await onVerifyPayment(selectedSaleId, 'Mpesa', code);
    setShowMpesaModal(false);
    setSelectedSaleId(null);
  };

const OrderItem: React.FC<{ 
  order: Sale, 
  isReady?: boolean, 
  isExpanded: boolean,
  onToggle: () => void,
  onVerifyCash: (id: string) => Promise<void>,
  onStartMpesaVerify: (id: string) => void,
  onUpdateStatus: (id: string, status: Sale['status']) => void,
  onCancelOrder: (id: string) => Promise<void>
}> = ({ 
  order, 
  isReady, 
  isExpanded, 
  onToggle, 
  onVerifyCash, 
  onStartMpesaVerify, 
  onUpdateStatus, 
  onCancelOrder 
}) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-[2.5rem] border ${isReady ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100'} shadow-sm flex flex-col group transition-all overflow-hidden`}
    >
      <div 
        className="p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-sm ${isReady ? 'bg-emerald-600' : 'bg-indigo-600'} text-white`}>
                Ticket #{order.ticketNumber || 'N/A'}
              </span>
              <span className="text-slate-300 text-[10px] uppercase font-bold tracking-widest">{order.status?.replace('_', ' ')}</span>
            </h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
              <i className="fa-solid fa-user-tag text-indigo-400 text-[8px]"></i> W: {order.created_by_waiter || 'Unknown'}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-2xl font-black text-slate-900 tracking-tighter block leading-none">Ksh {order.totalAmount.toLocaleString()}</span>
            <i className={`fa-solid fa-chevron-down text-[10px] text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} lg:hidden mt-2`}></i>
          </div>
        </div>

        {/* Desktop Content (Always Visible) */}
        <div className="hidden lg:block">
          {order.prepared_by_bar && (
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5 mb-2">
              <i className="fa-solid fa-fire-burner text-[8px]"></i> B: {order.prepared_by_bar}
            </p>
          )}
          <div className="mb-6 space-y-1 mt-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                <span className="truncate">{item.quantity}x {item.name}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 mt-auto">
            {order.status === 'SERVED' ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={(e) => { e.stopPropagation(); onVerifyCash(order.id); }} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-money-bill"></i> Cash
                </button>
                <button onClick={(e) => { e.stopPropagation(); onStartMpesaVerify(order.id); }} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2">
                  <i className="fa-solid fa-mobile-screen"></i> M-Pesa
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'SERVED'); }}
                  className={`py-4 ${order.status === 'READY' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2`}
                >
                  <i className="fa-solid fa-bell-concierge"></i> Mark Served
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); if(confirm("Cancel this order?")) onCancelOrder(order.id); }}
                  className="py-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-trash"></i> Void
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Content (Collapsible) */}
        <div className="lg:hidden">
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {order.prepared_by_bar && (
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5 mb-4">
                    <i className="fa-solid fa-fire-burner text-[8px]"></i> B: {order.prepared_by_bar}
                  </p>
                )}

                <div className="mb-6 space-y-1 mt-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                      <span className="truncate">{item.quantity}x {item.name}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2 mt-auto">
                  {order.status === 'SERVED' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={(e) => { e.stopPropagation(); onVerifyCash(order.id); }} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2">
                        <i className="fa-solid fa-money-bill"></i> Cash
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onStartMpesaVerify(order.id); }} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2">
                        <i className="fa-solid fa-mobile-screen"></i> M-Pesa
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(order.id, 'SERVED'); }}
                        className={`py-4 ${order.status === 'READY' ? 'bg-emerald-600' : 'bg-indigo-600'} text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2`}
                      >
                        <i className="fa-solid fa-bell-concierge"></i> Mark Served
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm("Cancel this order?")) onCancelOrder(order.id); }}
                        className="py-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-trash"></i> Void
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

  return (
    <div className="flex h-full flex-col gap-6 pb-20 lg:pb-0 overflow-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm shrink-0">
        <div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Counter Dashboard</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-3">{pendingOrders.length + readyOrders.length + servedOrders.length} Orders in Progress</p>
        </div>
        
        <div className="flex-1 max-w-xl w-full">
          <div className="relative group">
            <i className="fa-solid fa-ticket absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 z-10"></i>
            <input
              type="text"
              placeholder="QUICK SEARCH BY TICKET NUMBER..."
              className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-lg font-black tracking-widest placeholder:text-slate-300 transition-all shadow-inner"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => onSwitchView('POS')}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all active:scale-95 shadow-xl shadow-indigo-100 flex items-center gap-3"
          >
            <i className="fa-solid fa-cash-register"></i> Terminal Mode
          </button>
        </div>
      </div>

      {/* DASHBOARD GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-hidden min-h-0">
        
        {/* SECTION 1: PENDING / PREPARING */}
        <div className={`flex flex-col bg-slate-50 rounded-[3rem] border border-slate-200 p-8 shadow-inner overflow-hidden transition-all duration-500 ${collapsedSections['pending'] ? 'flex-none h-24 lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <div 
            className="flex items-center justify-between mb-8 shrink-0 cursor-pointer lg:cursor-default"
            onClick={() => window.innerWidth < 1024 && toggleSection('pending')}
          >
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span> Orders Pending ({pendingOrders.length})
            </h3>
            <i className={`fa-solid fa-chevron-down lg:hidden transition-transform ${collapsedSections['pending'] ? '' : 'rotate-180'}`}></i>
          </div>
          <motion.div 
            animate={{ height: collapsedSections['pending'] ? 0 : 'auto', opacity: collapsedSections['pending'] ? 0 : 1 }}
            className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2 lg:!h-auto lg:!opacity-100"
          >
            <AnimatePresence mode="popLayout">
              {pendingOrders.map(order => (
                <OrderItem 
                  key={order.id} 
                  order={order} 
                  isExpanded={!!expandedOrders[order.id]}
                  onToggle={() => toggleOrder(order.id)}
                  onVerifyCash={handleVerifyCash}
                  onStartMpesaVerify={handleStartMpesaVerify}
                  onUpdateStatus={onUpdateStatus}
                  onCancelOrder={onCancelOrder}
                />
              ))}
            </AnimatePresence>
            {pendingOrders.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-slate-300 opacity-40">
                <i className="fa-solid fa-check-double text-6xl mb-4"></i>
                <p className="font-black uppercase tracking-widest text-[10px]">No Pending Tasks</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* SECTION 2: READY FOR PICKUP */}
        <div className={`flex flex-col bg-emerald-50/20 rounded-[3rem] border border-emerald-100/30 p-8 shadow-inner overflow-hidden transition-all duration-500 ${collapsedSections['ready'] ? 'flex-none h-24 lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <div 
            className="flex items-center justify-between mb-8 shrink-0 cursor-pointer lg:cursor-default"
            onClick={() => window.innerWidth < 1024 && toggleSection('ready')}
          >
            <h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Ready for Pickup ({readyOrders.length})
            </h3>
            <i className={`fa-solid fa-chevron-down lg:hidden transition-transform ${collapsedSections['ready'] ? '' : 'rotate-180'}`}></i>
          </div>
          <motion.div 
            animate={{ height: collapsedSections['ready'] ? 0 : 'auto', opacity: collapsedSections['ready'] ? 0 : 1 }}
            className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2 lg:!h-auto lg:!opacity-100"
          >
            <AnimatePresence mode="popLayout">
              {readyOrders.map(order => (
                <OrderItem 
                  key={order.id} 
                  order={order} 
                  isReady 
                  isExpanded={!!expandedOrders[order.id]}
                  onToggle={() => toggleOrder(order.id)}
                  onVerifyCash={handleVerifyCash}
                  onStartMpesaVerify={handleStartMpesaVerify}
                  onUpdateStatus={onUpdateStatus}
                  onCancelOrder={onCancelOrder}
                />
              ))}
            </AnimatePresence>
            {readyOrders.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-slate-300 opacity-40">
                <i className="fa-solid fa-bell-concierge text-6xl mb-4"></i>
                <p className="font-black uppercase tracking-widest text-[10px]">Nothing to Pickup</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* SECTION 3: SERVED / RECENT */}
        <div className={`flex flex-col bg-white rounded-[3rem] border border-slate-200 p-8 overflow-hidden transition-all duration-500 ${collapsedSections['served'] ? 'flex-none h-24 lg:h-auto lg:flex-1' : 'flex-1'}`}>
          <div 
            className="flex items-center justify-between mb-8 shrink-0 cursor-pointer lg:cursor-default"
            onClick={() => window.innerWidth < 1024 && toggleSection('served')}
          >
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span> Served / Waiting Payment ({servedOrders.length})
            </h3>
            <i className={`fa-solid fa-chevron-down lg:hidden transition-transform ${collapsedSections['served'] ? '' : 'rotate-180'}`}></i>
          </div>
          <motion.div 
            animate={{ height: collapsedSections['served'] ? 0 : 'auto', opacity: collapsedSections['served'] ? 0 : 1 }}
            className="flex-1 overflow-y-auto space-y-4 no-scrollbar pr-2 lg:!h-auto lg:!opacity-100"
          >
            <AnimatePresence mode="popLayout">
              {servedOrders.map(order => (
                <OrderItem 
                  key={order.id} 
                  order={order} 
                  isExpanded={!!expandedOrders[order.id]}
                  onToggle={() => toggleOrder(order.id)}
                  onVerifyCash={handleVerifyCash}
                  onStartMpesaVerify={handleStartMpesaVerify}
                  onUpdateStatus={onUpdateStatus}
                  onCancelOrder={onCancelOrder}
                />
              ))}
            </AnimatePresence>
            
            <div className="mt-10 border-t border-slate-100 pt-8">
              <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Verified Today</h4>
              <AnimatePresence>
                {completedOrders.map((order) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    key={order.id} 
                    className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-2"
                  >
                    <div>
                      <span className="text-xs font-black text-slate-700 uppercase">Ticket #{order.ticketNumber}</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">W: {order.created_by_waiter}</p>
                    </div>
                    <span className="text-sm font-black text-slate-900 leading-none">Ksh {order.totalAmount.toLocaleString()}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* M-Pesa Modal stays the same */}
      {showMpesaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-10 shadow-2xl relative">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2 text-center">Verify M-Pesa</h3>
            <input
              type="text"
              className={`w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none uppercase mb-6`}
              placeholder="ENTER CODE..."
              value={mpesaCodeInput}
              onChange={e => setMpesaCodeInput(e.target.value.toUpperCase())}
              autoFocus
            />
            {mpesaError && <p className="text-[9px] font-bold text-rose-500 uppercase mb-4 text-center">{mpesaError}</p>}
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowMpesaModal(false)} className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase">Cancel</button>
              <button onClick={handleConfirmMpesaVerify} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase">Verify</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounterDashboard;
