import React, { useState } from 'react';
import { Sale, StaffLog, Role } from '../types';

interface CounterDashboardProps {
  sales: Sale[];
  staffLogs: StaffLog[];
  onVerifyPayment: (saleId: string, method: 'Cash' | 'Mpesa', mpesaCode?: string) => Promise<void>;
  onCancelOrder: (saleId: string) => Promise<void>;
  onSwitchView: (v: any) => void;
}

const CounterDashboard: React.FC<CounterDashboardProps> = ({ sales, staffLogs, onVerifyPayment, onCancelOrder, onSwitchView }) => {
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [mpesaCodeInput, setMpesaCodeInput] = useState('');
  const [mpesaError, setMpesaError] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');

  // 1. Pending Orders (status === 'PENDING_PAYMENT')
  const pendingOrders = sales.filter(s => 
    s.status === 'PENDING_PAYMENT' && 
    (ticketSearch === '' || s.ticketNumber?.toString().includes(ticketSearch))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 2. Active Waiters (signed in, not signed out, role WAITER)
  const activeWaiters = staffLogs.filter(log => log.role === Role.WAITER && !log.signOutTime);

  // 3. Recently Completed Orders (status === 'COMPLETED')
  const completedOrders = sales.filter(s => s.status === 'COMPLETED').sort((a, b) => new Date(b.completedAt || b.date).getTime() - new Date(a.completedAt || a.date).getTime()).slice(0, 10);

  // 4. Cancelled Orders
  const cancelledOrders = sales.filter(s => (s as any).status === 'CANCELLED').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

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
    const alphanumeric = /^[A-Z0-9]+$/;

    if (code.length < 8 || code.length > 12) {
      setMpesaError("Code must be 8-12 characters");
      return;
    }
    if (!alphanumeric.test(code)) {
      setMpesaError("Only letters and numbers allowed");
      return;
    }

    await onVerifyPayment(selectedSaleId, 'Mpesa', code);
    setShowMpesaModal(false);
    setSelectedSaleId(null);
  };

  return (
    <div className="flex h-full flex-col lg:flex-row gap-6 pb-20 lg:pb-0">
      
      {/* LEFT COLUMN - PENDING ORDERS */}
      <div className="flex-1 flex flex-col bg-slate-50 rounded-[3rem] border border-slate-200 p-8 shadow-inner overflow-hidden">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Counter</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{pendingOrders.length} Pending Orders</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onSwitchView('POS')}
              className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm border border-slate-100 flex items-center gap-2"
            >
              <i className="fa-solid fa-cash-register"></i> Terminal Mode
            </button>
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl text-indigo-500 shadow-sm border border-slate-100">
              <i className="fa-solid fa-cash-register"></i>
            </div>
          </div>
        </div>

        {/* Ticket Lookup */}
        <div className="mb-6">
          <div className="relative group">
            <i className="fa-solid fa-ticket absolute left-6 top-1/2 -translate-y-1/2 text-indigo-500 z-10"></i>
            <input
              type="text"
              placeholder="ENTER TICKET NUMBER TO FIND ORDER..."
              className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-lg font-black tracking-widest placeholder:text-slate-300 transition-all shadow-sm"
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value.replace(/\D/g, ''))}
            />
            {ticketSearch && (
              <button 
                onClick={() => setTicketSearch('')}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
              >
                <i className="fa-solid fa-circle-xmark text-xl"></i>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
          {pendingOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col group hover:border-indigo-200 transition-all">
              <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-4">
                <div>
                  <h4 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm">Ticket #{order.ticketNumber || 'N/A'}</span>
                    <span className="text-slate-300 text-[10px]">ID: {order.id.slice(-4)}</span>
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Waiter: {order.createdBy || 'Unknown'}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-slate-900 tracking-tighter block leading-none">Ksh {order.totalAmount.toLocaleString()}</span>
                  <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100 mt-2 inline-block animate-pulse">Pending Auth</span>
                </div>
              </div>

              {/* Order Items Summary */}
              <div className="mb-6 space-y-1">
                {order.items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                    <span className="truncate">{item.quantity}x {item.name}</span>
                    <span>Ksh {item.price * item.quantity}</span>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <p className="text-[10px] font-bold text-slate-400 italic mt-2">+ {order.items.length - 3} more items...</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 mt-auto">
                 <button 
                  onClick={() => handleVerifyCash(order.id)}
                  className="py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 active:scale-95 flex items-center justify-center gap-2 transition-all border border-slate-200"
                >
                  <i className="fa-solid fa-money-bill"></i> Cash
                </button>
                <button 
                  onClick={() => handleStartMpesaVerify(order.id)}
                  className="py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 active:scale-95 flex items-center justify-center gap-2 transition-all border border-emerald-200"
                >
                  <i className="fa-solid fa-mobile-screen"></i> M-Pesa
                </button>
                <button 
                  onClick={() => { if(confirm("Cancel this unverified order?")) onCancelOrder(order.id); }}
                  className="py-3 bg-rose-50 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 active:scale-95 flex items-center justify-center gap-2 transition-all border border-rose-100"
                >
                  <i className="fa-solid fa-trash"></i> Void
                </button>
              </div>
            </div>
          ))}

          {pendingOrders.length === 0 && (
             <div className="py-20 flex flex-col items-center justify-center text-slate-300">
               <i className="fa-solid fa-check-double text-6xl mb-4 opacity-20"></i>
               <p className="font-black uppercase tracking-widest text-[10px]">All caught up!</p>
             </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN - SIDEBAR DISPALYS */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0">
        
        {/* Active Waiters */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex-1 max-h-64 flex flex-col">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Active Waiters</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 no-scrollbar">
            {activeWaiters.map(waiter => (
              <div key={waiter.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs uppercase">
                  {waiter.userName.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-slate-800 uppercase truncate">{waiter.userName}</p>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Logged In</p>
                </div>
              </div>
            ))}
            {activeWaiters.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4 font-bold italic">No waiters active</p>}
          </div>
        </div>

        {/* Recently Completed Orders */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex-1 flex flex-col min-h-0">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Recently Verified</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 no-scrollbar">
            {completedOrders.map((order) => (
              <div key={order.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-black text-slate-700 uppercase">#{order.id.slice(-6)}</span>
                  <span className="text-sm font-black text-slate-900">Ksh {order.totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>W: {order.createdBy || 'N/A'}</span>
                  <span><i className="fa-solid fa-check text-emerald-500 mr-1"></i> {order.verifiedBy || 'N/A'}</span>
                </div>
              </div>
            ))}
             {completedOrders.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4 font-bold italic">No completed orders yet</p>}
          </div>
        </div>

        {/* Cancelled/Expired (Optional) */}
        {cancelledOrders.length > 0 && (
          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex flex-col min-h-0">
            <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">Voided Today</h3>
            <div className="space-y-2 opacity-60">
              {cancelledOrders.map(order => (
                 <div key={order.id} className="flex justify-between items-center p-2 bg-rose-50/30 rounded-xl border border-rose-100/30 text-[10px] font-bold text-rose-400 uppercase">
                    <span>Ticket #{order.ticketNumber}</span>
                    <span>Voided</span>
                 </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* M-Pesa Verification Modal */}
      {showMpesaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 shadow-xl shadow-emerald-100">
              <i className="fa-solid fa-mobile-screen-button"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2 text-center">Verify M-Pesa</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 text-center">Enter Transaction Code</p>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block px-2">Transaction Code</label>
                <input
                  type="text"
                  className={`w-full bg-slate-50 border ${mpesaError ? 'border-rose-500' : 'border-slate-200'} rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase placeholder:text-slate-300`}
                  placeholder="e.g. QKT7A1S2B"
                  value={mpesaCodeInput}
                  onChange={e => {
                    setMpesaCodeInput(e.target.value.toUpperCase());
                    setMpesaError('');
                  }}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmMpesaVerify()}
                />
                {mpesaError && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mt-2 px-2">{mpesaError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setShowMpesaModal(false); setSelectedSaleId(null); }} 
                  className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMpesaVerify}
                  className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-check"></i> Verify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounterDashboard;
