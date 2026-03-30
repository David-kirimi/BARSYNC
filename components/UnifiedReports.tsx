import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sale, Shift, Product, Business, User, Role } from '../types';
import ShiftHistory from './ShiftHistory';
import SalesHistory from './SalesHistory';
import Dashboard from './Dashboard';
import Reports from './Reports';

interface UnifiedReportsProps {
  sales: Sale[];
  shifts: Shift[];
  products: Product[];
  business: Business;
  currentUser: User;
}

type TabKey = 'SHIFT_RECORDS' | 'SALES_HISTORY' | 'PERFORMANCE' | 'BI_REPORTS';

const UnifiedReports: React.FC<UnifiedReportsProps> = ({ sales, shifts, products, business, currentUser }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('SHIFT_RECORDS');

  // Determine which tabs to show based on role
  const canSeeAll = currentUser.role === Role.ADMIN || currentUser.role === Role.OWNER || currentUser.role === Role.SUPER_ADMIN;
  
  // If not admin/owner, they default to Sales History because they shouldn't see Performance or BI Reports
  // But wait, the Sidebar restricts UNIFIED_REPORTS to ADMIN, OWNER, BARTENDER.
  // Bartender should only see Sales History.
  React.useEffect(() => {
    if (!canSeeAll && activeTab !== 'SALES_HISTORY') {
      setActiveTab('SALES_HISTORY');
    }
  }, [canSeeAll, activeTab]);

  const tabs = [
    ...(canSeeAll ? [{ key: 'SHIFT_RECORDS' as TabKey, label: 'Shift Records', icon: 'fa-clock-rotate-left' }] : []),
    { key: 'SALES_HISTORY' as TabKey, label: 'Sales History', icon: 'fa-receipt' },
    ...(canSeeAll ? [
      { key: 'PERFORMANCE' as TabKey, label: 'Performance', icon: 'fa-bolt' },
      { key: 'BI_REPORTS' as TabKey, label: 'BI Reports', icon: 'fa-chart-pie' }
    ] : []),
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header and Sub-navigation */}
      <div className="bg-white rounded-[2rem] p-4 lg:p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-900 rounded-full blur-[100px] opacity-[0.03] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
        
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase flex items-center gap-3">
            <i className="fa-solid fa-chart-pie text-indigo-600"></i>
            Shift Reports
          </h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            Data Hub &amp; Analytics
          </p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-indigo-600 shadow-md scale-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 hover:scale-95'
              }`}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'SHIFT_RECORDS' && canSeeAll && (
              <ShiftHistory shifts={shifts} sales={sales} businessName={business?.name} />
            )}
            
            {activeTab === 'SALES_HISTORY' && (
              <SalesHistory sales={sales} />
            )}
            
            {activeTab === 'PERFORMANCE' && canSeeAll && (
              <Dashboard sales={sales} products={products} business={business} />
            )}
            
            {activeTab === 'BI_REPORTS' && canSeeAll && (
              <Reports
                sales={sales}
                products={products}
                currentUser={currentUser}
                businessName={business?.name || 'BarSync'}
                logo={business?.logo}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UnifiedReports;
