
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
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  
  const [newBiz, setNewBiz] = useState<Omit<Business, 'id' | 'createdAt'>>({
    name: '', 
    ownerName: '', 
    mongoDatabase: 'barsync_prod', 
    mongoCollection: 'sync_history', 
    mongoConnectionString: 'https://barsync-backend.onrender.com',
    subscriptionStatus: 'Trial'
  });

  const [initialOwner, setInitialOwner] = useState({
    name: '',
    password: ''
  });

  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

  const handleAddPartner = () => {
    if (!newBiz.name || !newBiz.ownerName || !initialOwner.password) {
      alert("Please fill in all details.");
      return;
    }
    onAdd(newBiz, {
      name: initialOwner.name || newBiz.ownerName,
      role: Role.OWNER,
      avatar: `https://picsum.photos/seed/${newBiz.name}/100/100`,
      password: initialOwner.password
    });
    setShowAdd(false);
    setNewBiz({ name: '', ownerName: '', mongoDatabase: 'barsync_prod', mongoCollection: 'sync_history', mongoConnectionString: 'https://barsync-backend.onrender.com', subscriptionStatus: 'Trial' });
    setInitialOwner({ name: '', password: '' });
  };

  const handleUpdatePartner = () => {
    if (editingBiz) {
      onUpdate(editingBiz);
      setEditingBiz(null);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl border border-indigo-500/20">
          <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em] mb-3">Network GTV</p>
          <p className="text-4xl font-black tracking-tighter">Ksh {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Active Nodes</p>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">{businesses.length}</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Cloud Status</p>
          <div className="flex items-center gap-3">
             <span className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
             <p className="text-xl font-black text-slate-800 tracking-tight uppercase">Driver Live</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-xl">
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Hosted Backends</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Managed Production Endpoints</p>
          </div>
          <button 
            onClick={() => setShowAdd(true)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100"
          >
            Deploy New Node
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-10 py-6">Partner Identity</th>
                <th className="px-8 py-6">Production Hub URL</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-10 py-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.map(biz => (
                <tr key={biz.id} className="hover:bg-indigo-50/30 transition-all group">
                  <td className="px-10 py-8">
                    <div className="font-black text-slate-800 uppercase text-sm tracking-tight">{biz.name}</div>
                    <div className="text-[10px] text-indigo-500 font-mono mt-1 font-bold">NODE_{biz.id.toUpperCase()}</div>
                  </td>
                  <td className="px-8 py-8">
                    <code className="text-[10px] bg-slate-100 px-3 py-1 rounded-lg text-indigo-600 font-bold border border-indigo-100">{biz.mongoConnectionString}</code>
                  </td>
                  <td className="px-8 py-8">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      biz.subscriptionStatus === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                      {biz.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button onClick={() => setEditingBiz(biz)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
                      <i className="fa-solid fa-gear"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(showAdd || editingBiz) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-12 relative overflow-y-auto max-h-[90vh] no-scrollbar">
             <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
            <h3 className="text-3xl font-black text-slate-800 mb-8 uppercase tracking-tighter">
              {showAdd ? 'Provision Hub' : 'Hub Configuration'}
            </h3>
            
            <div className="space-y-8">
              <section className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Establishment Name</label>
                <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold" 
                  placeholder="e.g. Skyline Bar"
                  value={showAdd ? newBiz.name : editingBiz?.name} 
                  onChange={e => showAdd ? setNewBiz({...newBiz, name: e.target.value}) : setEditingBiz({...editingBiz!, name: e.target.value})} />
              </section>

              <section className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Deployment Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hosted Hub URL (Render/Vercel)</label>
                    <input className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 font-mono text-[10px]"
                      placeholder="https://your-app.onrender.com"
                      value={showAdd ? newBiz.mongoConnectionString : editingBiz?.mongoConnectionString}
                      onChange={e => showAdd ? setNewBiz({...newBiz, mongoConnectionString: e.target.value}) : setEditingBiz({...editingBiz!, mongoConnectionString: e.target.value})} />
                  </div>
                </div>
              </section>

              <div className="flex gap-4 pt-4">
                <button onClick={() => { setShowAdd(false); setEditingBiz(null); }} className="flex-1 py-5 font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl">Cancel</button>
                <button 
                  onClick={showAdd ? handleAddPartner : handleUpdatePartner} 
                  className="flex-1 py-5 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all transform active:scale-95"
                >
                  {showAdd ? 'Deploy Hub' : 'Update Hub'}
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
