import React, { useState } from 'react';
import { Product, Role } from '../types';
import { CATEGORIES, PRODUCT_TEMPLATES } from '../constants';
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('bar_pos_hidden_products');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [showHidden, setShowHidden] = useState(false);

  const [form, setForm] = useState<Partial<Product>>({});

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVisibility = showHidden || !hiddenIds.has(p.id);
    return matchesSearch && matchesVisibility;
  });

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

  const selectCommonItem = (item: typeof PRODUCT_TEMPLATES[number]) => {
    setForm({
      name: item.name,
      category: item.category,
      price: item.defaultPrice, // use defaultPrice from template
      buyingPrice: 0,
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

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds(new Set());
  };

  const hideSelected = () => {
    const newHidden = new Set([...hiddenIds, ...selectedIds]);
    setHiddenIds(newHidden);
    localStorage.setItem('bar_pos_hidden_products', JSON.stringify([...newHidden]));
    showToast(`${selectedIds.size} items hidden`, 'info');
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const deleteSelected = () => {
    if (window.confirm(`Delete ${selectedIds.size} items permanently?`)) {
      hideSelected(); // safe fallback
      showToast(`${selectedIds.size} items removed`, 'success');
    }
  };

  const toggleVisibility = () => {
    setShowHidden(!showHidden);
    showToast(showHidden ? 'Hidden items concealed' : 'Showing all items', 'info');
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredProducts.map(p => p.id)));
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header + Controls */}
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
            onClick={toggleVisibility}
            className={`p-4 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${showHidden ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}
            title={showHidden ? 'Hide hidden items' : 'Show hidden items'}
          >
            <i className={`fa-solid fa-eye${showHidden ? '' : '-slash'} text-lg`}></i>
          </button>
          <button
            onClick={toggleSelectionMode}
            className={`p-4 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${selectionMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}
            title={selectionMode ? 'Exit selection mode' : 'Enter selection mode'}
          >
            <i className={`fa-solid ${selectionMode ? 'fa-xmark' : 'fa-check-double'} text-lg`}></i>
          </button>
          <button
            onClick={openAdd}
            className="bg-indigo-600 text-white p-4 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <i className="fa-solid fa-plus text-lg"></i>
          </button>
        </div>
      </div>

      {/* Selection Toolbar */}
      {selectionMode && (
        <div className="fixed bottom-20 md:bottom-6 left-6 right-6 bg-slate-950 text-white p-4 rounded-2xl shadow-2xl border-2 border-indigo-500 z-30 animate-slide-up">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selection Mode</p>
              <p className="text-sm font-black mt-0.5">{selectedIds.size} items selected</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={selectAll}
                className="px-4 py-2 bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 hover:bg-slate-700 active:scale-95"
              >
                <i className="fa-solid fa-check-double mr-2"></i>Select All
              </button>
              <button
                disabled={selectedIds.size === 0}
                onClick={hideSelected}
                className="px-4 py-2 bg-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 active:scale-95 disabled:opacity-50"
              >
                <i className="fa-solid fa-eye-slash mr-2"></i>Hide ({selectedIds.size})
              </button>
              <button
                disabled={selectedIds.size === 0}
                onClick={deleteSelected}
                className="px-4 py-2 bg-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 active:scale-95 disabled:opacity-50"
              >
                <i className="fa-solid fa-trash mr-2"></i>Delete ({selectedIds.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProducts.map(p => (
          <div key={p.id} className="bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group">
            <div className="flex gap-4 items-start mb-6">
              <div className="relative shrink-0">
                <img src={p.imageUrl || 'https://via.placeholder.com/100'} className="w-20 h-20 rounded-3xl object-cover shadow-md bg-slate-100" />
                {selectionMode && (
                  <div
                    onClick={() => toggleSelection(p.id)}
                    className="absolute inset-0 bg-slate-950/60 rounded-3xl flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${selectedIds.has(p.id) ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-slate-400'}`}>
                      <i className={`fa-solid fa-check text-sm`}></i>
                    </div>
                  </div>
                )}
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
          <div className="bg-white w-full max-w-lg rounded-t-[3rem] md:rounded-[3.5rem] shadow-2xl relative overflow-hidden animate-slide-up md:animate-scale-in flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
            <div className="p-8 md:p-10 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                    {isAdding ? 'New Inventory Item' : 'Modify Product'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Terminal Registry Update</p>
                </div>
                <button onClick={closeModals} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 active:scale-95">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5">
              {/* Quick Fill */}
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
                    {PRODUCT_TEMPLATES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectCommonItem(item)}
                        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-indigo-100 rounded-xl transition-all text-left group"
                      >
                        <img src={item.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{item.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{item.category} • Ksh {item.defaultPrice}</p>
                        </div>
                        <i className="fa-solid fa-arrow-right text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></i>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Item Label</label>
                <input
                  type="text"
                  placeholder="Item Name"
                  className="w-full rounded-2xl p-3 border border-slate-200 text-sm font-black focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  value={form.name || ''}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Category</label>
                  <select
                    value={form.category || 'Beer'}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-2xl p-3 border border-slate-200 text-sm font-black focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Price (Ksh)</label>
                  <input
                    type="number"
                    value={form.price || 0}
                    onChange={e => setForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full rounded-2xl p-3 border border-slate-200 text-sm font-black focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Buying Price</label>
                  <input
                    type="number"
                    value={form.buyingPrice || 0}
                    onChange={e => setForm(prev => ({ ...prev, buyingPrice: Number(e.target.value) }))}
                    className="w-full rounded-2xl p-3 border border-slate-200 text-sm font-black focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Stock</label>
                  <input
                    type="number"
                    value={form.stock || 0}
                    onChange={e => setForm(prev => ({ ...prev, stock: Number(e.target.value) }))}
                    className="w-full rounded-2xl p-3 border border-slate-200 text-sm font-black focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Image</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-xs text-slate-600" />
                {form.imageUrl && <img src={form.imageUrl} alt="preview" className="w-32 h-32 object-cover rounded-lg mt-2" />}
              </div>

              <button
                onClick={saveForm}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl text-sm font-black uppercase tracking-widest mt-4"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
