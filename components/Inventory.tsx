
import React, { useState } from 'react';
import { Product, Role } from '../types';
import { CATEGORIES, COMMON_PRODUCTS } from '../constants';
import { useToast } from './Toast';

interface InventoryProps {
  products: Product[];
  onUpdate: (product: Product) => void;
  onAdd: (product: Omit<Product, 'id' | 'openingStock' | 'additions'>) => void;
  userRole: Role;
}

const Inventory: React.FC<InventoryProps> = ({ products, onUpdate, onAdd, userRole }) => {
  const { showToast } = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCommonPicker, setShowCommonPicker] = useState(false);

  const [form, setForm] = useState<Partial<Product>>({});

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuickStock = (product: Product, delta: number) => {
    onUpdate({ ...product, stock: Math.max(0, product.stock + delta) });
    showToast(`${product.name} stock updated`, 'success');
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm(product);
  };

  const openAdd = () => {
    setIsAdding(true);
    setShowCommonPicker(false);
    setForm({
      name: '',
      category: 'Beer',
      price: 0,
      buyingPrice: 0,
      stock: 0,
      imageUrl: ''
    });
  };

  const selectCommonItem = (item: Product) => {
    setForm({
      name: item.name,
      category: item.category,
      price: item.price,
      buyingPrice: item.buyingPrice || 0,
      stock: 0,
      imageUrl: item.imageUrl
    });
    setShowCommonPicker(false);
    showToast(`${item.name} template loaded`, 'info');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
        showToast("Image selected", "info");
      };
      reader.readAsDataURL(file);
    }
  };

  const saveForm = () => {
    if (isAdding) {
      onAdd(form as Omit<Product, 'id' | 'openingStock' | 'additions'>);
      showToast(`${form.name} registered`, 'success');
    } else if (editingProduct) {
      onUpdate({ ...editingProduct, ...form } as Product);
      showToast(`${form.name} updated`, 'success');
    }
    closeModals();
  };

  const closeModals = () => {
    setEditingProduct(null);
    setIsAdding(false);
    setForm({});
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Stock Control</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Global Inventory Management</p>
        </div>
        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
            <input
              type="text"
              placeholder="Search stock..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={openAdd}
            className="bg-indigo-600 text-white p-4 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <i className="fa-solid fa-plus text-lg"></i>
          </button>
        </div>
      </div>

      {/* Product List/Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProducts.map(p => (
          <div key={p.id} className="bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group">
            <div className="flex gap-4 items-start mb-6">
              <div className="relative shrink-0">
                <img src={p.imageUrl || 'https://via.placeholder.com/100'} className="w-20 h-20 rounded-3xl object-cover shadow-md bg-slate-100" />
                {p.stock < 10 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                    <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{p.category}</span>
                  <button
                    onClick={() => openEdit(p)}
                    className="text-slate-300 hover:text-indigo-600 transition-colors p-1"
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase leading-tight mb-1 truncate">{p.name}</h3>
                <div className="flex justify-between items-end">
                  <p className="text-lg font-black text-slate-900">Ksh {p.price.toLocaleString()}</p>
                  {(userRole === Role.OWNER || userRole === Role.ADMIN) && p.buyingPrice && (
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Profit</p>
                      <p className="text-[10px] font-black text-emerald-600">+Ksh {(p.price - p.buyingPrice).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-3xl p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">In Stock</p>
                <p className={`text-xl font-black ${p.stock < 10 ? 'text-rose-500' : 'text-slate-800'}`}>{p.stock} <span className="text-[10px] font-bold text-slate-400">PCS</span></p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuickStock(p, -1)}
                  className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90"
                >
                  <i className="fa-solid fa-minus text-xs"></i>
                </button>
                <button
                  onClick={() => handleQuickStock(p, 1)}
                  className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-90"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                </button>
                <button
                  onClick={() => handleQuickStock(p, 5)}
                  className="px-3 h-10 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all active:scale-90"
                >
                  +5
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Add Modal */}
      {(editingProduct || isAdding) && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 z-[100]">
          <div className="bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[3.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden animate-slide-up md:animate-scale-in">
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                  {isAdding ? 'New Inventory Item' : 'Modify Product'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Terminal Registry Update</p>
              </div>
              <button onClick={closeModals} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-6">
              {/* Common Items Quick Selector */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
                <button
                  type="button"
                  onClick={() => setShowCommonPicker(!showCommonPicker)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Quick Fill</p>
                    <p className="text-xs font-bold text-slate-600 mt-0.5">Select from common bar items</p>
                  </div>
                  <i className={`fa-solid fa-chevron-${showCommonPicker ? 'up' : 'down'} text-indigo-600`}></i>
                </button>
                {showCommonPicker && (
                  <div className="mt-3 max-h-48 overflow-y-auto space-y-2 pt-3 border-t border-indigo-100">
                    {COMMON_PRODUCTS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectCommonItem(item)}
                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-indigo-100 rounded-xl transition-all text-left group"
                      >
                        <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{item.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{item.category} • Ksh {item.price}</p>
                        </div>
                        <i className="fa-solid fa-arrow-right text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Item Label</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  value={form.name}
                  placeholder="e.g. Tusker Cider"
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Category</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Unit Price (Sale)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                  />
                </div>
              </div>

              {(userRole === Role.OWNER || userRole === Role.ADMIN) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Unit Buying Price (Cost)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                    value={form.buyingPrice}
                    placeholder="Profit tracking cost..."
                    onChange={e => setForm({ ...form, buyingPrice: Number(e.target.value) })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Current Count</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  value={form.stock}
                  onChange={e => setForm({ ...form, stock: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Product Icon</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    placeholder="Resource URL (optional)"
                    value={form.imageUrl}
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                  />
                  <label className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 h-14 w-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-slate-200 border-dashed">
                    <i className="fa-solid fa-cloud-arrow-up"></i>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <button
                onClick={saveForm}
                className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4"
              >
                <i className="fa-solid fa-check-circle"></i>
                {isAdding ? 'Register Product' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-scale-in { animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default Inventory;
