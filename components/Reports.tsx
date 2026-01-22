
import React, { useState, useMemo } from 'react';
import { Sale } from '../types';

interface ReportsProps {
  sales: Sale[];
  businessName: string;
}

const Reports: React.FC<ReportsProps> = ({ sales, businessName }) => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = s.date.split('T')[0];
      return saleDate >= startDate && saleDate <= endDate;
    });
  }, [sales, startDate, endDate]);

  const totalRevenue = useMemo(() => filteredSales.reduce((sum, s) => sum + s.totalAmount, 0), [filteredSales]);
  
  const categorySales = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredSales.forEach(s => {
      s.items.forEach(i => {
        cats[i.category] = (cats[i.category] || 0) + (i.price * i.quantity);
      });
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [filteredSales]);

  const exportPDF = () => {
    // Better print trigger for PDF saving
    window.print();
  };

  const exportCSV = () => {
    const headers = ['Sale ID', 'Date', 'Amount', 'Payment', 'Staff'];
    const rows = filteredSales.map(s => [
      s.id,
      new Date(s.date).toLocaleString(),
      s.totalAmount,
      s.paymentMethod,
      s.salesPerson
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BarSync_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Filter Section */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Start Date</label>
            <input 
              type="date" 
              className="w-full border border-slate-200 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">End Date</label>
            <input 
              type="date" 
              className="w-full border border-slate-200 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="pt-6 w-full md:w-auto flex gap-3">
            <button 
              onClick={exportCSV}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-file-csv"></i>
              CSV
            </button>
            <button 
              onClick={exportPDF}
              className="flex-1 md:flex-none px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
            >
              <i className="fa-solid fa-file-pdf"></i>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report View Section */}
      <div id="printable-report" className="bg-white p-10 md:p-16 rounded-[3.5rem] border border-slate-200 shadow-xl printable-area overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-slate-100 pb-10 mb-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-2xl">
                <i className="fa-solid fa-beer-mug-empty"></i>
              </div>
              <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">{businessName}</h1>
            </div>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Business Intelligence Report</p>
          </div>
          <div className="text-right mt-6 md:mt-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Interval</p>
            <p className="text-lg font-black text-slate-800 uppercase tracking-tighter">{startDate} <span className="text-slate-300 font-normal">thru</span> {endDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Financial Summary</h3>
            <div className="space-y-4">
              <div className="p-8 bg-slate-950 rounded-[2.5rem] text-white shadow-2xl">
                <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em] mb-2">Total Periodic Revenue</p>
                <p className="text-5xl font-black tracking-tighter text-indigo-400">Ksh {totalRevenue.toLocaleString()}</p>
              </div>
              <div className="flex gap-4">
                <div className="flex-1 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Orders</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">{filteredSales.length}</p>
                </div>
                <div className="flex-1 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Ticket</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">Ksh {filteredSales.length ? Math.round(totalRevenue/filteredSales.length).toLocaleString() : 0}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Revenue Mix</h3>
            <div className="space-y-3">
              {categorySales.map(([cat, amount]) => (
                <div key={cat} className="group flex justify-between items-center p-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{cat}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900 tracking-tighter">Ksh {amount.toLocaleString()}</span>
                </div>
              ))}
              {categorySales.length === 0 && <p className="text-slate-300 text-xs italic py-10 text-center uppercase tracking-widest">No transaction data</p>}
            </div>
          </div>
        </div>

        <div className="mt-16">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Transaction Registry</h3>
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{filteredSales.length} Logs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-5 px-4">Identifier</th>
                  <th className="py-5 px-4">Date & Time</th>
                  <th className="py-5 px-4">Method</th>
                  <th className="py-5 px-4 text-right">Settlement (Ksh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-5 px-4 font-mono text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{sale.id}</td>
                    <td className="py-5 px-4 text-xs font-medium text-slate-600">{new Date(sale.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short'})}</td>
                    <td className="py-5 px-4">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.1em] border px-2 py-1 rounded-lg">{sale.paymentMethod}</span>
                    </td>
                    <td className="py-5 px-4 text-right font-black text-slate-800 text-sm tracking-tight">{sale.totalAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">
          <span>© BarSync System Generated</span>
          <span>Security Key: {Math.random().toString(36).substr(2, 10).toUpperCase()}</span>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden, aside, nav, header { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          #printable-report { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            border: none; 
            box-shadow: none; 
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-area { 
            display: block !important; 
            visibility: visible !important; 
          }
          .no-scrollbar { overflow: visible !important; }
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
        }
        @page {
          size: auto;
          margin: 15mm;
        }
      `}</style>
    </div>
  );
};

export default Reports;
