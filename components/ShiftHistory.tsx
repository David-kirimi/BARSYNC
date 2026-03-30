import React, { useState, useMemo } from 'react';
import { Sale, Shift } from '../types';
import { generateShiftPDF } from '../lib/shiftPDF';

interface ShiftHistoryProps {
  shifts: Shift[];
  sales: Sale[];
  businessName?: string;
}

const ShiftHistory: React.FC<ShiftHistoryProps> = ({ shifts, sales, businessName = 'BarSync' }) => {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'stock'>('summary');
  const [searchTicket, setSearchTicket] = useState('');
  const [shiftSearch, setShiftSearch] = useState('');

  // Default: only show shifts from the last 48 hours.
  // When the user types in the search box, search across ALL historical shifts.
  const HOURS_48 = 48 * 60 * 60 * 1000;
  const isSearching = shiftSearch.trim().length > 0;
  const visibleShifts = useMemo(() => {
    if (isSearching) {
      const q = shiftSearch.trim().toLowerCase();
      return shifts.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.openedBy.toLowerCase().includes(q) ||
        (s.closedBy || '').toLowerCase().includes(q) ||
        new Date(s.startTime).toLocaleString('en-KE').toLowerCase().includes(q) ||
        String(s.totalSales).includes(q)
      );
    }
    const cutoff = Date.now() - HOURS_48;
    return shifts.filter(s => new Date(s.startTime).getTime() >= cutoff);
  }, [shifts, shiftSearch, isSearching]);

  const selectedShift = shifts.find(s => s.id === selectedShiftId);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-KE', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  const duration = (start: string, end?: string) => {
    const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  // Derive the sales that belong to the selected shift
  const shiftSales = useMemo(() => {
    if (!selectedShift) return [];
    return sales.filter(s => {
      if (s.shiftId === selectedShift.id) return true;
      // Fallback for legacy sales without shiftId — match by date range
      if (s.shiftId) return false;
      const saleT = new Date(s.date).getTime();
      const startT = new Date(selectedShift.startTime).getTime();
      const endT = selectedShift.endTime ? new Date(selectedShift.endTime).getTime() : Date.now();
      return saleT >= startT && saleT <= endT;
    });
  }, [selectedShift, sales]);

  const filteredSales = useMemo(() => {
    if (!searchTicket.trim()) return shiftSales;
    const q = searchTicket.trim().toLowerCase();
    return shiftSales.filter(s =>
      String(s.ticketNumber).includes(q) ||
      (s.salesPerson || '').toLowerCase().includes(q) ||
      (s.paymentMethod || '').toLowerCase().includes(q) ||
      s.items.some(i => i.name.toLowerCase().includes(q))
    );
  }, [shiftSales, searchTicket]);

  const completedSales = shiftSales.filter(s => s.status !== 'CANCELLED');

  const statusColor: Record<string, string> = {
    COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    PENDING_PAYMENT: 'bg-amber-50 text-amber-600 border-amber-100',
    PREPARING: 'bg-blue-50 text-blue-600 border-blue-100',
    SERVED: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    CANCELLED: 'bg-rose-50 text-rose-500 border-rose-100',
  };

  const pmIcon: Record<string, string> = {
    Cash: 'fa-money-bill-wave',
    Mpesa: 'fa-mobile-screen-button',
    Card: 'fa-credit-card',
    Pending: 'fa-clock',
  };

  return (
    <div className="space-y-8 pb-32 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Shift Registry</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
            {shifts.length} permanent records &mdash; historical shift performance &amp; reconciliation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

        {/* ── Left: Shift List ── */}
        <div className="xl:col-span-4 space-y-3">

          {/* Stats row */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Archive</p>
              <p className="text-lg font-black text-slate-700">{shifts.length} Shifts</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Showing</p>
              <p className="text-sm font-black text-indigo-600">
                {isSearching ? `${visibleShifts.length} results` : 'Last 48 hrs'}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]"></i>
            <input
              type="text"
              placeholder="Search all history — ID, staff, date..."
              value={shiftSearch}
              onChange={e => { setShiftSearch(e.target.value); setSelectedShiftId(null); }}
              className="w-full pl-10 pr-10 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm placeholder:text-slate-300"
            />
            {isSearching && (
              <button
                onClick={() => setShiftSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 rounded-lg flex items-center justify-center transition-all"
              >
                <i className="fa-solid fa-xmark text-[9px]"></i>
              </button>
            )}
          </div>

          {/* Context label */}
          {!isSearching && (
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center">
              <i className="fa-solid fa-clock mr-1"></i> Displaying last 48 hours &mdash; search to retrieve older records
            </p>
          )}
          {isSearching && visibleShifts.length === 0 && (
            <p className="text-[9px] font-black text-rose-300 uppercase tracking-widest text-center">
              No records match &ldquo;{shiftSearch}&rdquo;
            </p>
          )}

          {/* Shift cards */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
            {visibleShifts.map(shift => (
              <button
                key={shift.id}
                onClick={() => { setSelectedShiftId(shift.id); setActiveTab('summary'); setSearchTicket(''); }}
                className={`w-full text-left p-5 rounded-[2rem] border transition-all relative overflow-hidden ${
                  selectedShiftId === shift.id
                    ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200 scale-[1.02] z-10'
                    : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                {/* Status stripe */}
                <div className={`absolute left-0 top-0 h-full w-1.5 rounded-l-[2rem] ${shift.status === 'OPEN' ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                <div className="pl-2">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{shift.id}</p>
                      <p className="text-[11px] font-black uppercase">{formatDate(shift.startTime)}</p>
                    </div>
                    <span className={`text-[7px] font-black px-2 py-1 rounded-full uppercase tracking-wider border ${
                      shift.status === 'OPEN'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {shift.status}
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-0.5 ${selectedShiftId === shift.id ? 'text-indigo-400' : 'text-slate-400'}`}>
                        {shift.openedBy} &bull; {duration(shift.startTime, shift.endTime)}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400">{shift.transactionsCount} transactions</p>
                    </div>
                    <p className={`text-xl font-black tracking-tighter ${selectedShiftId === shift.id ? 'text-white' : 'text-slate-900'}`}>
                      Ksh {shift.totalSales.toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {!isSearching && visibleShifts.length === 0 && shifts.length > 0 && (
              <div className="py-12 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <i className="fa-solid fa-moon text-3xl text-slate-100 mb-3"></i>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">No shifts in last 48h</p>
                <p className="text-[9px] text-slate-300">Search above to retrieve older records</p>
              </div>
            )}
            {shifts.length === 0 && (
              <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <i className="fa-solid fa-clock-rotate-left text-4xl text-slate-100 mb-4"></i>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No shift records found</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Shift Detail ── */}
        <div className="xl:col-span-8">
          {selectedShift ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-[4rem] border border-slate-100 shadow-xl overflow-hidden">

                {/* Header card */}
                <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 block">Shift Record</span>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{selectedShift.id}</h3>
                    </div>
                    <span className={`text-[9px] font-black px-4 py-2 rounded-full border uppercase tracking-widest ${
                      selectedShift.status === 'OPEN'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {selectedShift.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Opened</p>
                      <p className="text-[10px] font-black text-slate-800 uppercase">{selectedShift.openedBy}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{formatTime(selectedShift.startTime)}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Closed</p>
                      <p className="text-[10px] font-black text-slate-800 uppercase">{selectedShift.closedBy || '—'}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{selectedShift.endTime ? formatTime(selectedShift.endTime) : 'Still open'}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                      <p className="text-[13px] font-black text-slate-800 tracking-tighter">{duration(selectedShift.startTime, selectedShift.endTime)}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Orders</p>
                      <p className="text-[13px] font-black text-slate-800 tracking-tighter">{selectedShift.transactionsCount} <span className="text-[9px] text-slate-400">total</span></p>
                      <p className="text-[9px] text-slate-400">{completedSales.length} completed</p>
                    </div>
                  </div>
                </div>

                {/* Sub-tab navigation */}
                <div className="flex border-b border-slate-100 px-8 pt-4 gap-1">
                  {(['summary', 'transactions', 'stock'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-5 py-2.5 rounded-t-2xl font-black text-[9px] uppercase tracking-widest transition-all ${
                        activeTab === tab
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {tab === 'summary' && <><i className="fa-solid fa-chart-pie mr-2"></i>Summary</>}
                      {tab === 'transactions' && <><i className="fa-solid fa-receipt mr-2"></i>Transactions <span className="ml-1 opacity-60">({shiftSales.length})</span></>}
                      {tab === 'stock' && <><i className="fa-solid fa-boxes-stacked mr-2"></i>Stock</>}
                    </button>
                  ))}
                </div>

                <div className="p-8 space-y-10">

                  {/* ── SUMMARY TAB ── */}
                  {activeTab === 'summary' && (
                    <>
                      <section>
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                          <i className="fa-solid fa-coins text-indigo-500"></i> Financial Breakdown
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2 md:col-span-1 p-8 bg-slate-950 rounded-[2.5rem] text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2">Net Sales</p>
                            <p className="text-2xl font-black tracking-tighter">Ksh {selectedShift.totalSales.toLocaleString()}</p>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <i className="fa-solid fa-money-bill-1-wave text-emerald-500"></i> Cash
                            </p>
                            <p className="text-lg font-black text-slate-800 tracking-tighter">Ksh {selectedShift.cashTotal.toLocaleString()}</p>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <i className="fa-solid fa-mobile-screen-button text-emerald-500"></i> M-Pesa
                            </p>
                            <p className="text-lg font-black text-slate-800 tracking-tighter">Ksh {selectedShift.mpesaTotal.toLocaleString()}</p>
                          </div>
                          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <i className="fa-solid fa-credit-card text-indigo-500"></i> Card
                            </p>
                            <p className="text-lg font-black text-slate-800 tracking-tighter">Ksh {selectedShift.cardTotal.toLocaleString()}</p>
                          </div>
                        </div>
                      </section>

                      {/* Top selling items summary */}
                      {completedSales.length > 0 && (() => {
                        const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
                        completedSales.forEach(s => s.items.forEach(i => {
                          if (!itemMap[i.id]) itemMap[i.id] = { name: i.name, qty: 0, revenue: 0 };
                          itemMap[i.id].qty += i.quantity;
                          itemMap[i.id].revenue += i.price * i.quantity;
                        }));
                        const topItems = Object.values(itemMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
                        return (
                          <section>
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                              <i className="fa-solid fa-trophy text-amber-500"></i> Top 5 Items This Shift
                            </h4>
                            <div className="space-y-2">
                              {topItems.map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : 'bg-slate-300'}`}>
                                    {i + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-slate-700 uppercase truncate">{item.name}</p>
                                    <p className="text-[9px] text-slate-400">{item.qty} units sold</p>
                                  </div>
                                  <p className="text-[12px] font-black text-slate-900 tracking-tighter">Ksh {item.revenue.toLocaleString()}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        );
                      })()}

                      {/* Transferred Tabs */}
                      {selectedShift.openTabsTransferred?.length > 0 && (
                        <section>
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                            <i className="fa-solid fa-arrow-right-arrow-left text-orange-500"></i> Transferred Open Tabs
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedShift.openTabsTransferred.map((tab, idx) => (
                              <div key={idx} className="p-5 bg-orange-50/50 rounded-3xl border border-orange-100 flex justify-between items-center">
                                <span className="text-[10px] font-black text-orange-900 uppercase">{tab.name}</span>
                                <span className="text-sm font-black text-orange-950 tracking-tighter">Ksh {tab.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </>
                  )}

                  {/* ── TRANSACTIONS TAB ── */}
                  {activeTab === 'transactions' && (
                    <section>
                      <div className="flex items-center justify-between mb-5">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                          <i className="fa-solid fa-receipt text-indigo-500"></i>
                          All Transactions ({shiftSales.length})
                        </h4>
                        <div className="relative">
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                          <input
                            type="text"
                            placeholder="Search ticket, staff, item..."
                            value={searchTicket}
                            onChange={e => setSearchTicket(e.target.value)}
                            className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-medium focus:outline-none focus:border-indigo-400 w-48"
                          />
                        </div>
                      </div>

                      {filteredSales.length === 0 ? (
                        <div className="py-16 text-center bg-slate-50 rounded-3xl">
                          <i className="fa-solid fa-inbox text-3xl text-slate-200 mb-3"></i>
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No transactions found</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[55vh] overflow-y-auto no-scrollbar pr-1">
                          {filteredSales.map(sale => (
                            <div key={sale.id} className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden hover:shadow-md transition-all">
                              {/* Sale row header */}
                              <div className="flex items-center justify-between px-5 py-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-200 rounded-2xl flex items-center justify-center">
                                    <span className="text-[9px] font-black text-slate-600">#{sale.ticketNumber || '—'}</span>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-700 uppercase">{sale.salesPerson || sale.created_by_waiter || 'Unknown'}</p>
                                    <p className="text-[9px] text-slate-400">{formatDate(sale.date)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${statusColor[sale.status || 'COMPLETED'] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    <i className={`fa-solid ${pmIcon[sale.paymentMethod] || 'fa-circle'} text-[8px]`}></i>
                                    {sale.paymentMethod}
                                  </div>
                                  <span className={`px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${statusColor[sale.status || 'COMPLETED'] || 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                    {sale.status || 'COMPLETED'}
                                  </span>
                                  <p className="text-[14px] font-black text-slate-900 tracking-tighter min-w-[80px] text-right">
                                    Ksh {sale.totalAmount.toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Line items */}
                              <div className="px-5 pb-4 flex flex-wrap gap-2">
                                {sale.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                    <span className="text-[9px] font-black text-slate-600 uppercase">{item.name}</span>
                                    <span className="text-[8px] font-bold text-slate-400">×{item.quantity}</span>
                                    <span className="text-[9px] font-black text-indigo-500">Ksh {(item.price * item.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                                {sale.mpesaCode && (
                                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                                    <i className="fa-solid fa-check-circle text-emerald-500 text-[8px]"></i>
                                    <span className="text-[9px] font-black text-emerald-700 font-mono">{sale.mpesaCode}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Totals summary bar */}
                      {shiftSales.length > 0 && (
                        <div className="mt-5 p-5 bg-slate-900 rounded-3xl text-white flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Displayed</p>
                            <p className="text-sm font-black">{filteredSales.length} of {shiftSales.length} transactions</p>
                          </div>
                          <div className="flex gap-6">
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase">Completed</p>
                              <p className="text-sm font-black">{completedSales.length}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase">Cancelled</p>
                              <p className="text-sm font-black text-rose-400">{shiftSales.filter(s => s.status === 'CANCELLED').length}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase">Revenue</p>
                              <p className="text-sm font-black text-indigo-300">Ksh {completedSales.reduce((s, x) => s + x.totalAmount, 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </section>
                  )}

                  {/* ── STOCK TAB ── */}
                  {activeTab === 'stock' && (
                    <section>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 flex items-center gap-3">
                        <i className="fa-solid fa-boxes-stacked text-indigo-500"></i> Stock Movement
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                          <thead>
                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <th className="px-5 py-3">Item</th>
                              <th className="px-5 py-3 text-center">Opening</th>
                              <th className="px-5 py-3 text-center">Sold</th>
                              <th className="px-5 py-3 text-center">Closing</th>
                              <th className="px-5 py-3 text-right">Variance</th>
                            </tr>
                          </thead>
                          <tbody className="text-xs">
                            {selectedShift.openingStockSnapshot.map(open => {
                              const close = selectedShift.closingStockSnapshot?.find(c => c.productId === open.productId);
                              const soldQty = completedSales.reduce((total, sale) => {
                                const item = sale.items.find(i => i.id === open.productId);
                                return total + (item ? item.quantity : 0);
                              }, 0);
                              const expected = open.quantity - soldQty;
                              const variance = close ? close.quantity - expected : null;
                              return (
                                <tr key={open.productId} className="bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-all">
                                  <td className="px-5 py-4 font-black text-slate-700 uppercase rounded-l-2xl text-[11px]">{open.productName}</td>
                                  <td className="px-5 py-4 font-black text-slate-600 text-center">{open.quantity}</td>
                                  <td className="px-5 py-4 font-black text-center text-indigo-500">{soldQty}</td>
                                  <td className="px-5 py-4 font-black text-center text-slate-600">{close?.quantity ?? '—'}</td>
                                  <td className={`px-5 py-4 font-black text-right rounded-r-2xl ${
                                    variance === null ? 'text-slate-300' :
                                    variance < 0 ? 'text-rose-500' :
                                    variance > 0 ? 'text-emerald-500' : 'text-slate-400'
                                  }`}>
                                    {variance === null ? '—' : variance === 0 ? 'Verified' : variance > 0 ? `+${variance}` : variance}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {/* Print button */}
                  <div className="pt-4 flex gap-4">
                    <button
                      onClick={() => generateShiftPDF(selectedShift, businessName, shiftSales)}
                      className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 active:scale-95 shadow-2xl shadow-slate-200 transition-all flex items-center justify-center gap-3"
                    >
                      <i className="fa-solid fa-print"></i> Print Full Shift Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[72vh] flex flex-col items-center justify-center text-center bg-white rounded-[5rem] border-2 border-dashed border-slate-100 p-20">
              <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8">
                <i className="fa-solid fa-file-contract"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Select a Shift</h3>
              <p className="text-sm text-slate-400 font-medium max-w-xs leading-relaxed">
                Choose a shift from the registry to view its full transaction log, financial summary, and stock reconciliation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftHistory;
