
import React from 'react';
import { Sale } from '../types';

interface SalesHistoryProps {
  sales: Sale[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales }) => {
  const [search, setSearch] = React.useState('');
  const [sortField, setSortField] = React.useState<'date' | 'salesPerson' | 'totalAmount'>('date');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');

  const formatLongDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });

    const j = day % 10, k = day % 100;
    let suffix = "th";
    if (j === 1 && k !== 11) suffix = "st";
    if (j === 2 && k !== 12) suffix = "nd";
    if (j === 3 && k !== 13) suffix = "rd";

    return `${dayName} ${day}${suffix} ${month}`;
  };

  const handleSort = (field: 'date' | 'salesPerson' | 'totalAmount') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedAndFilteredSales = React.useMemo(() => {
    return [...sales]
      .filter(s =>
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.salesPerson.toLowerCase().includes(search.toLowerCase()) ||
        s.paymentMethod.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'date') {
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [sales, search, sortField, sortDirection]);

  const handlePrint = () => {
    const printContent = document.getElementById('sales-report-table');
    if (!printContent) return;
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 print:hidden">
        <div className="bg-orange-950 p-8 rounded-[3rem] text-white shadow-2xl border border-orange-500/20">
          <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em] mb-3">Total Revenue</p>
          <p className="text-4xl font-black tracking-tighter">Ksh {sales.reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Total Count</p>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">{sales.length}</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Average Transaction</p>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">
            Ksh {sales.length > 0 ? (sales.reduce((sum, s) => sum + s.totalAmount, 0) / sales.length).toFixed(0).toLocaleString() : 0}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-xl" id="sales-report-table">
        <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-6 print:hidden">
          <div className="flex-1 w-full relative">
            <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 font-bold outline-none"
              placeholder="Filter by Transaction ID, Staff, or Method..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={handlePrint}
            className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 flex items-center gap-3 active:scale-95"
          >
            <i className="fa-solid fa-file-pdf"></i>
            Export PDF Report
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Identity</th>
                <th className="px-8 py-6 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('date')}>
                  Date & Time <i className={`fa-solid fa-sort${sortField === 'date' ? (sortDirection === 'asc' ? '-up' : '-down') : ''} ml-2 opacity-30`}></i>
                </th>
                <th className="px-8 py-6 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('salesPerson')}>
                  Staff Member <i className={`fa-solid fa-sort${sortField === 'salesPerson' ? (sortDirection === 'asc' ? '-up' : '-down') : ''} ml-2 opacity-30`}></i>
                </th>
                <th className="px-8 py-6">Payment</th>
                <th className="px-10 py-6 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalAmount')}>
                  Amount (Ksh) <i className={`fa-solid fa-sort${sortField === 'totalAmount' ? (sortDirection === 'asc' ? '-up' : '-down') : ''} ml-2 opacity-30`}></i>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAndFilteredSales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center text-slate-400 font-bold">No matching records found</td>
                </tr>
              ) : (
                sortedAndFilteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-orange-50/30 transition-all group">
                    <td className="px-10 py-6">
                      <span className="font-black text-slate-400 text-[10px] group-hover:text-orange-500 transition-colors uppercase">#{sale.id}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{formatLongDate(sale.date)}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-200"></div>
                        <span className="text-[11px] font-black text-slate-700 uppercase">{sale.salesPerson}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${sale.paymentMethod === 'Mpesa' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        sale.paymentMethod === 'Card' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right font-black text-slate-900 text-sm">
                      {sale.totalAmount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #sales-report-table, #sales-report-table * { visibility: visible; }
          #sales-report-table { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            border: none;
            box-shadow: none;
          }
          .print\\\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default SalesHistory;
