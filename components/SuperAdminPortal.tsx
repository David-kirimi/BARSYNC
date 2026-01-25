
import React, { useState } from 'react';
import { Business, Sale, Role, User } from '../types';
import { useToast } from './Toast';

interface SuperAdminPortalProps {
  businesses: Business[];
  onAdd: (biz: Omit<Business, 'id' | 'createdAt'>, initialUser: Omit<User, 'id' | 'businessId' | 'status'>) => void;
  onUpdate: (biz: Business) => void;
  onDelete?: (id: string) => void;
  onUpdateUser?: (user: User) => void;
  onDeleteUser?: (id: string) => void;
  sales: Sale[];
  allUsers?: User[];
}

const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({ businesses, onAdd, onUpdate, onDelete, onUpdateUser, onDeleteUser, sales, allUsers = [] }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'NODES' | 'STAFF' | 'INBOX'>('NODES');
  const [showAdd, setShowAdd] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');

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

  const filteredBusinesses = businesses.filter(b => (b.subscriptionStatus !== 'Pending Approval') && (b.name.toLowerCase().includes(search.toLowerCase()) || b.ownerName.toLowerCase().includes(search.toLowerCase())));
  const pendingBusinesses = businesses.filter(b => b.subscriptionStatus === 'Pending Approval');
  const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()));

  const handleAddPartner = () => {
    if (!newBiz.name || !newBiz.ownerName || !initialOwner.password) {
      showToast("Missing details! Fill all fields.", "warning");
      return;
    }

    onAdd(newBiz, {
      name: initialOwner.name || newBiz.ownerName,
      role: Role.OWNER,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newBiz.ownerName}`,
      password: initialOwner.password,
      updatedAt: new Date().toISOString()
    });

    setShowAdd(false);
    setNewBiz({
      name: '',
      ownerName: '',
      mongoDatabase: 'barsync_prod',
      mongoCollection: 'sync_history',
      mongoConnectionString: 'https://barsync-backend.onrender.com',
      subscriptionStatus: 'Trial'
    });
    setInitialOwner({ name: '', password: '' });
  };

  return (
    <div className="space-y-10 pt-16 md:pt-0 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-orange-950 p-8 rounded-[3rem] text-white shadow-2xl border border-orange-500/20">
          <p className="text-[10px] font-black opacity-50 uppercase tracking-[0.3em] mb-3">Network GTV</p>
          <p className="text-4xl font-black tracking-tighter">Ksh {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Active Nodes</p>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">{businesses.length}</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Staff Managed</p>
          <p className="text-4xl font-black text-slate-800 tracking-tighter">{allUsers.length}</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-100 pb-2">
        <button
          onClick={() => setActiveTab('NODES')}
          className={`px-8 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'NODES' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Partner Nodes
        </button>
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-8 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'STAFF' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Master Staff Directory
        </button>
        <button
          onClick={() => setActiveTab('INBOX')}
          className={`relative px-8 py-3 text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'INBOX' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Partner Inbox
          {pendingBusinesses.length > 0 && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
          )}
        </button>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-xl">
        <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-6">
          <div className="flex-1 w-full">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 font-bold outline-none"
                placeholder={`Search ${activeTab === 'NODES' ? 'partners...' : 'staff across network...'}`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          {activeTab === 'NODES' && (
            <button
              onClick={() => setShowAdd(true)}
              className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-100"
            >
              Deploy New Node
            </button>
          )}
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {activeTab === 'NODES' ? (
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
                {filteredBusinesses.map(biz => (
                  <tr key={biz.id} className="hover:bg-orange-50/30 transition-all group">
                    <td className="px-10 py-8">
                      <div className="font-black text-slate-800 uppercase text-sm tracking-tight">{biz.name}</div>
                      <div className="text-[10px] text-orange-500 font-mono mt-1 font-bold">NODE_{biz.id.toUpperCase()}</div>
                    </td>
                    <td className="px-8 py-8">
                      <code className="text-[10px] bg-slate-100 px-3 py-1 rounded-lg text-orange-600 font-bold border border-orange-100">{biz.mongoConnectionString}</code>
                    </td>
                    <td className="px-8 py-8">
                      <div className="flex flex-col gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit ${biz.subscriptionStatus === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          biz.subscriptionStatus === 'Trial' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                            'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                          {biz.subscriptionStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setEditingBiz(biz)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-orange-600 transition-all">
                          <i className="fa-solid fa-gear"></i>
                        </button>
                        <button onClick={() => onDelete?.(biz.id)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 transition-all">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'STAFF' ? (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-10 py-6">Staff Profile</th>
                  <th className="px-8 py-6">Assigned Node</th>
                  <th className="px-8 py-6">Role / Level</th>
                  <th className="px-10 py-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-orange-50/30 transition-all group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-100" />
                        <div>
                          <div className="font-black text-slate-800 uppercase text-sm tracking-tight">{user.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.status}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-8">
                      <span className="text-[11px] font-black text-slate-600 uppercase">
                        {businesses.find(b => b.id === user.businessId)?.name || 'Platform Admin'}
                      </span>
                    </td>
                    <td className="px-8 py-8">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${user.role === 'SUPER_ADMIN' ? 'bg-orange-950 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setEditingUser(user)} className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-orange-600 transition-all">
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          onClick={() => onDeleteUser?.(user.id)}
                          className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 transition-all"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 space-y-8">
              {pendingBusinesses.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No pending partnership requests</div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {pendingBusinesses.map(biz => (
                    <div key={biz.id} className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 transition-all hover:shadow-lg">
                      <div className="flex-1">
                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">{biz.name}</h4>
                        <div className="flex gap-4 items-center">
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-3 py-1 rounded-lg border border-orange-100">Requesting {biz.subscriptionPlan}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By: {biz.ownerName}</span>
                        </div>
                        {biz.verificationNote && (
                          <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction Message:</p>
                            <p className="text-[11px] font-bold text-slate-600">{biz.verificationNote}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => onUpdate({ ...biz, subscriptionStatus: 'Active', paymentStatus: 'Verified' })}
                          className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-100 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onDelete?.(biz.id)}
                          className="bg-rose-50 text-rose-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-rose-100 active:scale-95 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Configuration Modal (Shared for Biz and User) */}
      {(showAdd || editingBiz || editingUser) && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-12 relative overflow-y-auto max-h-[90vh] no-scrollbar">
            <div className="absolute top-0 left-0 w-full h-2 bg-orange-600"></div>

            {editingUser ? (
              <div className="space-y-8">
                <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Edit Staff Access</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Display Name</label>
                    <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 font-bold" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Role Level</label>
                    <select className="w-full border border-slate-200 rounded-2xl px-5 py-4 font-bold" value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value as Role })}>
                      {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setEditingUser(null)} className="flex-1 py-5 font-black text-[11px] uppercase tracking-widest text-slate-400">Cancel</button>
                  <button onClick={() => { onUpdateUser?.(editingUser); setEditingUser(null); }} className="flex-1 py-5 bg-orange-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl">Confirm Update</button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                  {showAdd ? 'Provision Hub' : 'Hub Configuration'}
                </h3>

                <div className="space-y-8">
                  <section className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Establishment Name</label>
                      <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold"
                        placeholder="e.g. Skyline Bar"
                        value={showAdd ? newBiz.name : editingBiz?.name}
                        onChange={e => showAdd ? setNewBiz({ ...newBiz, name: e.target.value }) : setEditingBiz({ ...editingBiz!, name: e.target.value })} />
                    </div>

                    {showAdd && (
                      <>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Owner Name</label>
                          <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold"
                            placeholder="Owner's Name"
                            value={newBiz.ownerName}
                            onChange={e => setNewBiz({ ...newBiz, ownerName: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Initial Access PIN / Password</label>
                          <input className="w-full border border-slate-200 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none font-bold tracking-widest"
                            type="password"
                            placeholder="••••••"
                            value={initialOwner.password}
                            onChange={e => setInitialOwner({ ...initialOwner, password: e.target.value })} />
                        </div>
                      </>
                    )}
                  </section>

                  <section className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em]">Deployment & Status</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Hosted Hub URL (Render/Vercel)</label>
                        <input className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 font-mono text-[10px]"
                          placeholder="https://your-app.onrender.com"
                          value={showAdd ? newBiz.mongoConnectionString : editingBiz?.mongoConnectionString}
                          onChange={e => showAdd ? setNewBiz({ ...newBiz, mongoConnectionString: e.target.value }) : setEditingBiz({ ...editingBiz!, mongoConnectionString: e.target.value })} />
                      </div>
                      {!showAdd && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Plan</label>
                            <select
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold"
                              value={editingBiz?.subscriptionPlan}
                              onChange={e => setEditingBiz({ ...editingBiz!, subscriptionPlan: e.target.value as any })}
                            >
                              <option value="Basic">Basic</option>
                              <option value="Pro">Pro</option>
                              <option value="Enterprise">Enterprise</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Status</label>
                            <select
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold"
                              value={editingBiz?.subscriptionStatus}
                              onChange={e => setEditingBiz({ ...editingBiz!, subscriptionStatus: e.target.value as any })}
                            >
                              <option value="Trial">Trial</option>
                              <option value="Active">Active</option>
                              <option value="Expired">Expired</option>
                              <option value="Pending Approval">Pending Approval</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  <div className="flex gap-4 pt-4">
                    <button onClick={() => { setShowAdd(false); setEditingBiz(null); }} className="flex-1 py-5 font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl">Cancel</button>
                    <button
                      onClick={showAdd ? handleAddPartner : () => { onUpdate(editingBiz!); setEditingBiz(null); }}
                      className="flex-1 py-5 bg-orange-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/30 hover:bg-indigo-700 transition-all transform active:scale-95"
                    >
                      {showAdd ? 'Deploy Hub' : 'Update Hub'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPortal;
