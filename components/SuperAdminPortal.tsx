
import React, { useState } from 'react';
import { Business, Sale, Role, User } from '../types';

interface SuperAdminPortalProps {
  businesses: Business[];
  onAdd: (biz: Omit<Business, 'id' | 'createdAt'>, initialUser: Omit<User, 'id' | 'businessId' | 'status'>) => void;
  onUpdate: (biz: Business) => void;
  sales: Sale[];
}

const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({ businesses, onAdd, onUpdate, sales }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newBiz, setNewBiz] = useState<Omit<Business, 'id' | 'createdAt'>>({
    name: '', ownerName: '', mongoDatabase: '', mongoCollection: '', subscriptionStatus: 'Trial'
  });
  const [initialOwner, setInitialOwner] = useState({
    name: '',
    password: ''
  });

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  const handleAddPartner = () => {
    if (!newBiz.name || !newBiz.ownerName || !initialOwner.password) {
      alert("Please fill in all business and owner details.");
      return;
    }
    onAdd(newBiz, {
      name: initialOwner.name || newBiz.ownerName,
      role: Role.OWNER,
      avatar: `https://picsum.photos/seed/${newBiz.name}/100/100`,
      password: initialOwner.password
    });
    setShowAdd(false);
    setNewBiz({ name: '', ownerName: '', mongoDatabase: '', mongoCollection: '', subscriptionStatus: 'Trial' });
    setInitialOwner({ name: '', password: '' });
  };

  return (
    <div className="space-y-10">
      {/* High-Level Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group border border-emerald-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em] mb-3">Network GTV (Cloud)</p>
          <p className="text-4xl font-black tracking-tighter">Ksh {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Partners on MongoDB</p>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">{businesses.length}</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Database Health</p>
          <div className="flex items-center gap-3">
             <span className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></span>
             <p className="text-xl font-black text-slate-800 tracking-tight uppercase">Connected</p>
          </div>
        </div>
      </div>

      {/* Partner Directory */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-xl">
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Node Registry</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Managed MongoDB Atlas Endpoints</p>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-100 active:scale-95 flex items-center gap-3"
          >
            <i className="fa-solid fa-plus"></i> New Partner Node
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Partner Identity</th>
                <th className="px-8 py-6">Access Owner</th>
                <th className="px-8 py-6">Subscription</th>
                <th className="px-8 py-6">MongoDB Namespace</th>
                <th className="px-10 py-6 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.map(biz => (
                <tr key={biz.id} className="hover:bg-indigo-50/30 transition-all group">
                  <td className="px-10 py-8">
                    <div className="font-black text-slate-800 uppercase text-sm tracking-tight">{biz.name}</div>
                    <div className="text-[10px] text-indigo-500 font-mono mt-1 font-bold">SID: {biz.id}</div>
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                        {biz.ownerName.charAt(0)}
                      </div>
                      <span className="text-sm text-slate-600 font-bold">{biz.ownerName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      biz.subscriptionStatus === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      biz.subscriptionStatus === 'Trial' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {biz.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-8 py-8">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 font-mono text-[10px] text-slate-600">
                        <i className="fa-solid fa-database text-[8px] text-emerald-500"></i>
                        {biz.mongoDatabase || 'not_set'}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[9px] text-slate-400">
                        <i className="fa-solid fa-layer-group text-[8px]"></i>
                        {biz.mongoCollection || 'default'}
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => onUpdate({ ...biz, subscriptionStatus: biz.subscriptionStatus === 'Active' ? 'Expired' : 'Active' })}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm"
                        title="Update Status"
                      >
                        <i className="fa-solid fa-plug"></i>
                      </button>
                      <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-12 relative overflow-y-auto max-h-[90vh] no-scrollbar">
             <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            <h3 className="text-3xl font-black text-slate-800 mb-8 uppercase tracking-tighter">Atlas Partner Onboarding</h3>
            
            <div className="space-y-8">
              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] border-b border-emerald-50 pb-2">Business Metadata</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Business Name</label>
                    <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold" 
                      placeholder="The Junction"
                      value={newBiz.name} onChange={e => setNewBiz({...newBiz, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Primary Owner</label>
                    <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold"
                      placeholder="Jeniffer Maina"
                      value={newBiz.ownerName} onChange={e => setNewBiz({...newBiz, ownerName: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Target Database</label>
                    <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono text-xs"
                      placeholder="e.g. pos_main"
                      value={newBiz.mongoDatabase} onChange={e => setNewBiz({...newBiz, mongoDatabase: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Collection Node</label>
                    <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono text-xs"
                      placeholder="e.g. junction_tx"
                      value={newBiz.mongoCollection} onChange={e => setNewBiz({...newBiz, mongoCollection: e.target.value})} />
                  </div>
                </div>
              </section>

              <section className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Partner Credentials</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Terminal ID</label>
                    <input className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold" 
                      placeholder="Owner Username"
                      value={initialOwner.name} onChange={e => setInitialOwner({...initialOwner, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Access Token (PIN)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold tracking-widest"
                      type="password"
                      placeholder="Initial Access Code"
                      value={initialOwner.password} onChange={e => setInitialOwner({...initialOwner, password: e.target.value})} />
                  </div>
                </div>
              </section>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-5 font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">Cancel</button>
                <button 
                  onClick={handleAddPartner} 
                  className="flex-1 py-5 bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/30 hover:bg-emerald-700 transition-all transform active:scale-95"
                >
                  Deploy Node
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPortal;
