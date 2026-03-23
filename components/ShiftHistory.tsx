import React, { useState } from 'react';
import { Sale, Shift, StockSnapshot } from '../types';
import { generateShiftPDF } from '../lib/shiftPDF';

interface ShiftHistoryProps {
  shifts: Shift[];
  sales: Sale[];
  businessName?: string;
}

const ShiftHistory: React.FC<ShiftHistoryProps> = ({ shifts, sales, businessName = 'BarSync' }) => {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);

  const selectedShift = shifts.find(s => s.id === selectedShiftId);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8 pb-32 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Shift Registry</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Historical shift performance & reconciliation</p>
        </div>
        <div className="flex gap-2">
          <button className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-xl shadow-slate-200">
            <i className="fa-solid fa-download"></i> Export All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Shift List */}
        <div className="xl:col-span-4 space-y-3">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Available Records</p>
            <p className="text-lg font-black text-slate-700">{shifts.length} Recorded Shifts</p>
          </div>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 no-scrollbar">
            {shifts.map(shift => (
              <button
                key={shift.id}
                onClick={() => setSelectedShiftId(shift.id)}
                className={`w-full text-left p-6 rounded-[2rem] border transition-all relative overflow-hidden group ${
                  selectedShiftId === shift.id 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-2xl shadow-slate-200 scale-[1.02] z-10' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${selectedShiftId === shift.id ? 'text-slate-400' : 'text-slate-400'}`}>ID: {shift.id}</p>
                    <p className="text-xs font-black uppercase">{formatDate(shift.startTime)}</p>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${
                    shift.status === 'OPEN' 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {shift.status}
                  </span>
                </div>
                <div className="flex items-end justify-between">
                   <div>
                      <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${selectedShiftId === shift.id ? 'text-indigo-400' : 'text-slate-400'}`}>Staff</p>
                      <p className="text-[10px] font-black uppercase">{shift.openedBy}</p>
                   </div>
                   <p className={`text-xl font-black tracking-tighter ${selectedShiftId === shift.id ? 'text-white' : 'text-slate-900'}`}>Ksh {shift.totalSales.toLocaleString()}</p>
                </div>
              </button>
            ))}
            {shifts.length === 0 && (
              <div className="py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <i className="fa-solid fa-clock-rotate-left text-4xl text-slate-100 mb-4"></i>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No shift history found</p>
              </div>
            )}
          </div>
        </div>

        {/* Shift Details */}
        <div className="xl:col-span-8">
          {selectedShift ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-[4rem] border border-slate-100 shadow-xl overflow-hidden">
                <div className="p-10 border-b border-slate-50 bg-slate-50/50">
                  <div className="flex justify-between items-start mb-8">
                     <div>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-3 block">Reconciliation Report</span>
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Shift Details</h3>
                     </div>
                     <div className="text-right">
                        <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{selectedShift.id}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: {selectedShift.status}</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Duration</p>
                      <p className="text-xs font-black text-slate-800 uppercase leading-relaxed">
                        Starts: {formatDate(selectedShift.startTime)}<br/>
                        Ends: {selectedShift.endTime ? formatDate(selectedShift.endTime) : 'Running'}
                      </p>
                    </div>
                    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Staff in Charge</p>
                      <p className="text-xs font-black text-slate-800 uppercase leading-relaxed">
                        Opened: {selectedShift.openedBy}<br/>
                        Closed: {selectedShift.closedBy || '--'}
                      </p>
                    </div>
                    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Transactions</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tighter">{selectedShift.transactionsCount} <span className="text-[10px] text-slate-400 uppercase ml-1">Orders</span></p>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-12">
                  {/* Financial Section */}
                  <section>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                      <i className="fa-solid fa-coins text-indigo-500"></i> Financial Breakdown
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-8 bg-slate-950 rounded-[2.5rem] text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2">Net Sales</p>
                        <p className="text-3xl font-black tracking-tighter">Ksh {selectedShift.totalSales.toLocaleString()}</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <i className="fa-solid fa-money-bill-1-wave text-emerald-500"></i> Cash
                        </p>
                        <p className="text-xl font-black text-slate-800 tracking-tighter">Ksh {selectedShift.cashTotal.toLocaleString()}</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <i className="fa-solid fa-mobile-screen-button text-emerald-500"></i> M-Pesa
                        </p>
                        <p className="text-xl font-black text-slate-800 tracking-tighter">Ksh {selectedShift.mpesaTotal.toLocaleString()}</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                           <i className="fa-solid fa-credit-card text-indigo-500"></i> Card
                        </p>
                        <p className="text-xl font-black text-slate-800 tracking-tighter">Ksh {selectedShift.cardTotal.toLocaleString()}</p>
                      </div>
                    </div>
                  </section>

                  {/* Stock Section */}
                  <section>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                      <i className="fa-solid fa-boxes-stacked text-indigo-500"></i> Stock Movement
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                          <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <th className="px-6 py-4">Item Name</th>
                            <th className="px-6 py-4">Opening</th>
                            <th className="px-6 py-4 text-center">Closing</th>
                            <th className="px-6 py-4 text-center">Sold</th>
                            <th className="px-6 py-4 text-right">Variance</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          {selectedShift.openingStockSnapshot.map(open => {
                            const close = selectedShift.closingStockSnapshot?.find(c => c.productId === open.productId);
                            const soldQuantity = 0; // In a real app, calculate from sales
                            const expected = open.quantity - soldQuantity;
                            const variance = close ? close.quantity - expected : 0;

                            return (
                              <tr key={open.productId} className="bg-slate-50 rounded-2xl group hover:bg-slate-100 transition-all">
                                <td className="px-6 py-5 font-black text-slate-700 uppercase rounded-l-2xl">{open.productName}</td>
                                <td className="px-6 py-5 font-black text-slate-600">{open.quantity}</td>
                                <td className="px-6 py-5 font-black text-center text-slate-600">{close?.quantity || '--'}</td>
                                <td className="px-6 py-5 font-black text-center text-indigo-500">{open.quantity - (close?.quantity || open.quantity)}</td>
                                <td className={`px-6 py-5 font-black text-right rounded-r-2xl ${variance < 0 ? 'text-rose-500' : variance > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                                  {variance === 0 ? 'Verified' : variance > 0 ? `+${variance}` : variance}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Transferred Tabs */}
                  {selectedShift.openTabsTransferred.length > 0 && (
                    <section>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <i className="fa-solid fa-arrow-right-arrow-left text-orange-500"></i> Transferred Open Tabs
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedShift.openTabsTransferred.map((tab, idx) => (
                          <div key={idx} className="p-6 bg-orange-50/50 rounded-3xl border border-orange-100 flex justify-between items-center">
                            <span className="text-[10px] font-black text-orange-900 uppercase">{tab.name}</span>
                            <span className="text-sm font-black text-orange-950 tracking-tighter">Ksh {tab.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="pt-10 flex gap-4">
                     <button
                        onClick={() => generateShiftPDF(selectedShift, businessName, sales.filter(s => s.shiftId === selectedShift.id))}
                        className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 active:scale-95 shadow-2xl shadow-slate-200 transition-all"
                     >
                        <i className="fa-solid fa-print mr-3"></i> Print Shift Report
                     </button>
                     <button className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all">
                        <i className="fa-solid fa-share-nodes"></i>
                     </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[70vh] flex flex-col items-center justify-center text-center bg-white rounded-[5rem] border-2 border-dashed border-slate-100 p-20">
               <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8">
                  <i className="fa-solid fa-file-contract"></i>
               </div>
               <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">Select a shift record</h3>
               <p className="text-sm text-slate-400 font-medium max-w-xs leading-relaxed">
                  Choose a shift from the registry on the left to view detailed reconciliation reports and stock movements.
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftHistory;
