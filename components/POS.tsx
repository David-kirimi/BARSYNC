import React, { useState, useMemo } from 'react';
import { Product, CartItem, Sale } from '../types';
import { CATEGORIES } from '../constants';
import { useToast } from './Toast';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface POSProps {
  products: Product[];
  addToCart: (product: Product) => void;
  cart: CartItem[];
  updateCartQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  onCheckout: (method: 'Cash' | 'Mpesa' | 'Card', customerPhone?: string) => Sale | undefined;
  businessName: string;
  onReorder: (newOrder: Product[]) => void;

  // Tab Extensions
  tabs: any[];
  onOpenTab: (name: string) => Promise<any | undefined>;
  onAddToTab: (tabId: string, item: Product) => Promise<void>;
  onSettleTab: (tabId: string, method: 'Cash' | 'Mpesa' | 'Card') => Promise<Sale | undefined>;
  onCancelTab: (tabId: string) => Promise<void>;
  onUpdateTabQuantity: (tabId: string, productId: string, delta: number) => Promise<void>;
  onAddCartToTab: (tabId: string, items: CartItem[]) => Promise<void>;
  activeView: string;
}

/* -------------------- SORTABLE ITEM COMPONENT -------------------- */
const SortableProductCard: React.FC<{ product: Product, addToCart: (p: Product) => void }> = ({ product, addToCart }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all h-full flex flex-col"
    >
      {/* Drag Handle (Invisible but active on long press or explicit grab area if needed) - here entire card is draggable, but we prioritize click for add */}

      <div
        className="h-32 lg:h-40 overflow-hidden relative cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <img src={product.imageUrl || 'https://via.placeholder.com/400?text=No+Image'} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 pointer-events-none" />
        {product.stock < 10 && product.stock > 0 && (
          <div className="absolute top-2 left-2 bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">
            Low: {product.stock}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1" onClick={() => product.stock > 0 && addToCart(product)}> {/* Click logic here */}
        <h3 className="font-black text-slate-800 mb-1 leading-tight h-8 line-clamp-2 uppercase text-[12px] tracking-tight">{product.name}</h3>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xs lg:text-md font-black text-indigo-600">Ksh {product.price}</span>
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all cursor-pointer">
            <i className="fa-solid fa-plus text-xs"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

const POS: React.FC<POSProps> = ({
  products, addToCart, cart, updateCartQuantity, removeFromCart, onCheckout,
  businessName, onReorder, tabs, onOpenTab, onAddToTab, onSettleTab, onCancelTab,
  onUpdateTabQuantity, onAddCartToTab, activeView
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [custPhone, setCustPhone] = useState('');
  const [mobileCartExpanded, setMobileCartExpanded] = useState(false);

  // Tab UI State
  const [showOpenTabModal, setShowOpenTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [isOpeningTab, setIsOpeningTab] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts, preventing accidental drags on clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      const hasStock = p.stock > 0; // AUTO-HIDE OUT OF STOCK
      return matchesSearch && matchesCategory && hasStock;
    });
  }, [products, search, activeCategory]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      // We need to reorder the GLOBAL product list based on the change in the FILTERED list.
      // 1. Find the old index and new index in the DISPLAYED list
      const oldIndex = filteredProducts.findIndex((p) => p.id === active.id);
      const newIndex = filteredProducts.findIndex((p) => p.id === over?.id);

      // 2. Create the new order for the DISPLAYED subset
      const newFilteredOrder = arrayMove(filteredProducts, oldIndex, newIndex) as Product[];

      // 3. Construct the full new list:
      //    - Keep items NOT in the filtered view in their original relative positions (or just push them to end/start? No, keep them inplace-ish)
      //    - Actually, for a simple "favorites" system, reordering usually implies a global rank.
      //    - Strategy: Take the global list, remove the filtered items, then re-insert them in their new order at their original "first" index? 
      //    - Simpler Strategy: Just replace the products in the master list.

      const productIds = new Set(newFilteredOrder.map(p => p.id));
      const remainingProducts = products.filter(p => !productIds.has(p.id));
      const combined = [...newFilteredOrder, ...remainingProducts]; // This moves filtered items to top. Good for favorites.

      onReorder(combined);
    }
  };

  const handleCheckout = async (method: 'Cash' | 'Mpesa' | 'Card') => {
    const sale = await onCheckout(method, custPhone);
    if (sale) {
      setLastSale(sale);
      setShowReceipt(true);
      setCustPhone('');
      showToast("Sale successful!", "success");
    }
  };

  const shareReceiptWhatsApp = () => {
    if (!lastSale) return;
    const itemsText = lastSale.items.map(i => `• ${i.name} x${i.quantity} @ Ksh ${i.price}`).join('%0A');
    const message = `*RECEIPT: ${businessName}*%0A%0ATransaction ID: ${lastSale.id}%0ADate: ${new Date(lastSale.date).toLocaleString()}%0A%0AItems:%0A${itemsText}%0A%0A*TOTAL: Ksh ${lastSale.totalAmount.toLocaleString()}*%0APayment: ${lastSale.paymentMethod}%0A%0A_Thank you for your business!_`;
    const phone = lastSale.customerPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleOpenTab = async () => {
    if (!newTabName.trim()) return;
    setIsOpeningTab(true);
    await onOpenTab(newTabName);
    setNewTabName('');
    setShowOpenTabModal(false);
    setIsOpeningTab(false);
  };

  const handleAddToTab = async (tabId: string) => {
    if (cart.length === 0) return;
    await onAddCartToTab(tabId, cart);
    cart.forEach(i => removeFromCart(i.id));
    setMobileCartExpanded(false);
  };

  const handleSettleTab = async (tabId: string, method: 'Cash' | 'Mpesa' | 'Card') => {
    setIsSettling(true);
    const sale = await onSettleTab(tabId, method);
    if (sale) {
      setLastSale(sale);
      setShowReceipt(true);
      showToast("Tab settled!", "success");
    }
    setIsSettling(false);
  };

  return (
    <div className="flex h-full flex-col lg:flex-row gap-2 lg:gap-8 pb-32 lg:pb-0">
      <div className="flex-1 flex flex-col min-w-0">
        {activeView === 'TABS' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Notebook</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{tabs.length} Active Sessions</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOpenTabModal(true)}
                  className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 flex items-center gap-3 shadow-xl shadow-slate-200"
                >
                  <i className="fa-solid fa-plus"></i> Open New Tab
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-64 lg:pb-0">
              {tabs.map(tab => (
                <div key={tab.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all p-8 flex flex-col group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-orange-400 group-hover:w-4 transition-all"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-black text-slate-800 text-lg uppercase leading-none mb-1">{tab.customerName}</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Served By: {tab.servedBy}</p>
                    </div>
                    <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-100 uppercase tracking-widest">Open</span>
                  </div>

                  <div className="flex-1 space-y-3 mb-8 max-h-48 overflow-y-auto no-scrollbar border-y border-slate-50 py-4">
                    {tab.items.map((i: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black text-slate-700 uppercase block truncate">{i.name}</span>
                          <span className="text-[9px] font-bold text-slate-400">Ksh {i.price}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                            <button onClick={() => onUpdateTabQuantity(tab.id, i.id, -1)} className="text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-minus text-[8px]"></i></button>
                            <span className="text-[10px] font-black w-4 text-center">{i.quantity}</span>
                            <button onClick={() => onUpdateTabQuantity(tab.id, i.id, 1)} className="text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-plus text-[8px]"></i></button>
                          </div>
                          <span className="text-[10px] font-black text-slate-900 w-16 text-right">Ksh {i.price * i.quantity}</span>
                        </div>
                      </div>
                    ))}
                    {tab.items.length === 0 && <p className="text-[10px] text-slate-300 italic text-center py-4">Empty Tab - Add items in Terminal</p>}
                  </div>

                  <div className="flex items-center justify-between mb-8">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Debt</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">Ksh {tab.totalAmount.toLocaleString()}</span>
                  </div>

                  {cart.length > 0 && (
                    <button
                      onClick={() => handleAddToTab(tab.id)}
                      className="w-full mb-3 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <i className="fa-solid fa-cart-arrow-down"></i> Add Items from Terminal
                    </button>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => { handleSettleTab(tab.id, 'Cash'); }} className="py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 active:scale-95">Cash</button>
                    <button onClick={() => { handleSettleTab(tab.id, 'Mpesa'); }} className="py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest border border-emerald-100 hover:bg-emerald-100 active:scale-95">M-Pesa</button>
                    <button onClick={() => { if (confirm("Cancel this tab and restore items to stock?")) onCancelTab(tab.id); }} className="py-3 bg-rose-50 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest border border-rose-100 hover:bg-rose-100 active:scale-95">Void</button>
                  </div>
                </div>
              ))}
              {tabs.length === 0 && (
                <div className="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                  <i className="fa-solid fa-book-open text-6xl mb-4 opacity-20"></i>
                  <p className="font-black uppercase tracking-widest text-[10px]">No active tabs found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="mb-2 lg:mb-8 space-y-3 lg:space-y-4">
              <div className="relative group">
                <i className="fa-solid fa-magnifying-glass absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 lg:pl-14 pr-4 lg:pr-6 py-3 lg:py-5 bg-white border border-slate-200 rounded-xl lg:rounded-[2rem] focus:outline-none shadow-sm text-sm lg:text-lg font-medium"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto pr-2">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredProducts.map(p => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                    {filteredProducts.map(product => (
                      <SortableProductCard key={product.id} product={product} addToCart={addToCart} />
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="col-span-full py-12 text-center text-slate-400">
                        <p className="font-bold">No active items found.</p>
                        <p className="text-xs">Out-of-stock items are hidden automatically.</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Cart - Hidden on Mobile */}
      <div className="hidden lg:flex w-full lg:w-[26rem] bg-white border border-slate-200 rounded-[3rem] shadow-2xl flex-col shrink-0 overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Current Order</h2>
          <button onClick={() => cart.forEach(i => removeFromCart(i.id))} className="text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-widest">Clear</button>
        </div>

        <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-3 lg:space-y-4">
          {cart.map(item => (
            <div key={item.id} className="flex gap-3 lg:gap-4 p-3 lg:p-4 bg-slate-50 rounded-[1.5rem] lg:rounded-[2rem] border border-transparent hover:border-indigo-100 transition-all">
              <img src={item.imageUrl} className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl object-cover shadow-md" alt="" />
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-black text-[11px] lg:text-[13px] text-slate-800 truncate uppercase tracking-tight">{item.name}</h4>
                <p className="text-[10px] lg:text-xs font-bold text-indigo-500 mt-0.5">Ksh {item.price}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-rose-500"><i className="fa-solid fa-circle-xmark text-sm"></i></button>
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-sm">
                  <button onClick={() => updateCartQuantity(item.id, -1)} className="text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-minus text-[10px]"></i></button>
                  <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.id, 1)} className="text-slate-400 hover:text-indigo-600"><i className="fa-solid fa-plus text-[10px]"></i></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 lg:p-10 bg-slate-950 text-white rounded-t-[2rem] lg:rounded-[3.5rem] space-y-4 lg:space-y-8 shrink-0">
          <div className="space-y-2">
            <div className="relative">
              <i className="fa-brands fa-whatsapp absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"></i>
              <input
                type="text"
                placeholder="Customer Phone (for WhatsApp)"
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all"
                value={custPhone}
                onChange={e => setCustPhone(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Total Pay</span>
              <span className="text-2xl lg:text-4xl font-black tracking-tighter">Ksh {cartTotal.toLocaleString()}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <button disabled={cart.length === 0} onClick={() => handleCheckout('Cash')} className="py-4 bg-slate-800 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50">Cash</button>
            <button disabled={cart.length === 0} onClick={() => handleCheckout('Mpesa')} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-50">M-Pesa</button>

            {/* Add to Tab Mechanism */}
            <div className="relative group">
              <button
                disabled={cart.length === 0}
                className="w-full h-full py-4 bg-orange-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-500 shadow-xl shadow-orange-900/40 transition-all active:scale-95 disabled:opacity-50"
              >
                To Tab <i className="fa-solid fa-chevron-up ml-1 text-[8px]"></i>
              </button>

              {/* Dropdown for active tabs */}
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden hidden group-hover:block z-50">
                <div className="max-h-48 overflow-y-auto no-scrollbar">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => handleAddToTab(tab.id)}
                      className="w-full px-4 py-3 text-left hover:bg-orange-50 flex items-center justify-between border-b border-slate-50 last:border-0"
                    >
                      <span className="text-[10px] font-bold text-slate-700 uppercase truncate">{tab.customerName}</span>
                      <i className="fa-solid fa-plus text-orange-500 text-[10px]"></i>
                    </button>
                  ))}
                  {tabs.length === 0 && <p className="p-3 text-[9px] text-slate-400 font-bold italic text-center">No active tabs</p>}
                </div>
                <button
                  onClick={() => setShowOpenTabModal(true)}
                  className="w-full p-3 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all"
                >
                  New Tab
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Cart - Only visible on mobile */}
      <div className="lg:hidden">
        {/* Sticky Bottom Panel - Collapsed State */}
        <div
          onClick={() => setMobileCartExpanded(true)}
          className="fixed bottom-0 left-0 right-0 bg-slate-950 text-white p-4 shadow-2xl border-t-4 border-indigo-500 z-40 safe-area-bottom"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Order</p>
              <p className="text-xl font-black mt-0.5">Ksh {cartTotal.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-indigo-500 px-3 py-1.5 rounded-full">
                <span className="text-[10px] font-black">{cart.length} items</span>
              </div>
              <i className="fa-solid fa-chevron-up text-slate-400"></i>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={cart.length === 0}
              onClick={(e) => { e.stopPropagation(); handleCheckout('Cash'); }}
              className="py-4 bg-slate-800 rounded-xl font-black text-[11px] uppercase tracking-widest border border-slate-700 active:scale-95 disabled:opacity-50 transition-all"
            >
              <i className="fa-solid fa-money-bills mr-2"></i>Cash
            </button>
            <button
              disabled={cart.length === 0}
              onClick={(e) => { e.stopPropagation(); handleCheckout('Mpesa'); }}
              className="py-4 bg-emerald-600 rounded-xl font-black text-[11px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all"
            >
              <i className="fa-solid fa-mobile-screen mr-2"></i>M-Pesa
            </button>
          </div>
          {/* Mobile Tab Quick Add - Only if items in cart */}
          {cart.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowOpenTabModal(true); }}
                className="px-4 py-2 bg-indigo-600/20 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-500/30 whitespace-nowrap"
              >
                + New Tab
              </button>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={(e) => { e.stopPropagation(); handleAddToTab(tab.id); }}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/40 whitespace-nowrap"
                >
                  To {tab.customerName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expanded State - Full Screen Bottom Sheet */}
        {mobileCartExpanded && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 animate-fade-in"
            onClick={() => setMobileCartExpanded(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] shadow-2xl max-h-[85vh] flex flex-col animate-slide-up-mobile"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">Order Details</h2>
                <button
                  onClick={() => setMobileCartExpanded(false)}
                  className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center active:scale-95"
                >
                  <i className="fa-solid fa-xmark text-slate-600"></i>
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-3 p-3 bg-slate-50 rounded-2xl border border-transparent active:border-indigo-100 transition-all">
                    <img src={item.imageUrl} className="w-14 h-14 rounded-xl object-cover shadow-md" alt="" />
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-black text-[12px] text-slate-800 truncate uppercase tracking-tight">{item.name}</h4>
                      <p className="text-[11px] font-bold text-indigo-500 mt-0.5">Ksh {item.price}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-300 active:text-rose-500 p-1">
                        <i className="fa-solid fa-circle-xmark text-lg"></i>
                      </button>
                      <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-xl shadow-sm border border-slate-100">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="text-slate-400 active:text-indigo-600 p-1">
                          <i className="fa-solid fa-minus text-[11px]"></i>
                        </button>
                        <span className="text-sm font-black w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="text-slate-400 active:text-indigo-600 p-1">
                          <i className="fa-solid fa-plus text-[11px]"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="text-center py-12">
                    <i className="fa-solid fa-cart-shopping text-5xl text-slate-200 mb-4"></i>
                    <p className="text-slate-400 font-bold text-sm">Cart is empty</p>
                  </div>
                )}
                {cart.length > 0 && tabs.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 px-1">Assign to Open Tab</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {tabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => handleAddToTab(tab.id)}
                          className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-tight text-slate-700 hover:border-orange-500 hover:bg-orange-50 transition-all text-left flex items-center justify-between"
                        >
                          <span className="truncate">{tab.customerName}</span>
                          <i className="fa-solid fa-plus text-orange-500"></i>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 bg-slate-950 text-white rounded-t-[2rem] space-y-4 shrink-0 safe-area-bottom">
                <div className="space-y-2">
                  <div className="relative">
                    <i className="fa-brands fa-whatsapp absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500"></i>
                    <input
                      type="text"
                      placeholder="Customer Phone (for WhatsApp)"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all"
                      value={custPhone}
                      onChange={e => setCustPhone(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Total Pay</span>
                    <span className="text-3xl font-black tracking-tighter">Ksh {cartTotal.toLocaleString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={cart.length === 0}
                    onClick={() => { handleCheckout('Cash'); setMobileCartExpanded(false); }}
                    className="py-4 bg-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-700 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    Cash
                  </button>
                  <button
                    disabled={cart.length === 0}
                    onClick={() => { handleCheckout('Mpesa'); setMobileCartExpanded(false); }}
                    className="py-4 bg-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-900/40 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    M-Pesa
                  </button>
                  <button
                    disabled={cart.length === 0}
                    onClick={() => { handleCheckout('Card'); setMobileCartExpanded(false); }}
                    className="py-4 bg-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-900/40 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    Card
                  </button>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => { cart.forEach(i => removeFromCart(i.id)); setMobileCartExpanded(false); }}
                    className="w-full py-3 bg-slate-900 text-rose-400 border border-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                  >
                    <i className="fa-solid fa-trash mr-2"></i>Clear Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Open Tab Modal */}
      {showOpenTabModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Notebook Entry</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Start a new customer session</p>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block px-2">Customer Name / Table</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all uppercase"
                  placeholder="e.g. SLIEM @ TABLE 5"
                  value={newTabName}
                  onChange={e => setNewTabName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowOpenTabModal(false)} className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95">Cancel</button>
                <button
                  onClick={handleOpenTab}
                  disabled={!newTabName.trim() || isOpeningTab}
                  className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isOpeningTab ? 'Syncing...' : 'Open Tab'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white rounded-[4rem] w-full max-w-md p-10 shadow-2xl relative overflow-hidden animate-slide-up-mobile">
            {/* Design Accents */}
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-orange-400 to-amber-600"></div>
            <div className="absolute -right-16 -top-16 w-40 h-40 bg-orange-50 rounded-full blur-3xl opacity-50"></div>

            <div className="text-center mb-8 relative">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-emerald-100 rotate-6">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-2">Order Confirmed!</h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">{businessName} • Digital Receipt</p>
            </div>

            <div className="bg-slate-50/50 rounded-[2.5rem] p-8 space-y-6 border border-slate-100 mb-8 max-h-60 overflow-y-auto no-scrollbar">
              <div className="space-y-4">
                {lastSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span className="truncate pr-4 uppercase tracking-tight">{item.name} <span className="text-slate-400">x{item.quantity}</span></span>
                    <span className="shrink-0 text-slate-900 tracking-tighter">Ksh {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-200 border-dashed space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Method</span>
                  <span className="text-orange-600">{lastSale.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Total Pay</span>
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tighter">Ksh {lastSale.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={shareReceiptWhatsApp}
                className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] hover:bg-orange-700 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-orange-200 active:scale-95"
              >
                <i className="fa-brands fa-whatsapp text-xl"></i>
                Send to Customer
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => window.print()}
                  className="py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-orange-200 hover:text-orange-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-print"></i>
                  Print
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                >
                  <i className="fa-solid fa-check"></i>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up-mobile {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up-mobile { animation: slide-up-mobile 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
};

export default POS;
