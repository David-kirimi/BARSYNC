import React, { useState, useMemo } from 'react';
import { Product, CartItem, Sale, Shift, StockSnapshot, Role } from '../types';
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
  onCheckout: (method: 'Cash' | 'Mpesa' | 'Card' | 'Pending', customerPhone?: string, mpesaCode?: string) => Promise<Sale | undefined>;
  businessName: string;
  onReorder: (newOrder: Product[]) => void;

  // Tab Extensions
  tabs: any[];
  onOpenTab: (name: string) => Promise<any | undefined>;
  onAddToTab: (tabId: string, item: Product) => Promise<void>;
  onSettleTab: (tabId: string, method: 'Cash' | 'Mpesa' | 'Card', mpesaCode?: string) => Promise<Sale | undefined>;
  onCancelTab: (tabId: string) => Promise<void>;
  onUpdateTabQuantity: (tabId: string, productId: string, delta: number) => Promise<void>;
  onAddCartToTab: (tabId: string, items: CartItem[]) => Promise<void>;
  activeView: string;
  isUnverified?: boolean;
  sales: Sale[];
  userRole?: Role;

  // Shift Management
  currentShift: Shift | null;
  onStartShift: () => Promise<void>;
  onCloseShift: (closingStock: StockSnapshot[]) => Promise<void>;
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
  onUpdateTabQuantity, onAddCartToTab, activeView, isUnverified,
  currentShift, onStartShift, onCloseShift, sales, userRole
}) => {
  const alphanumeric = /^[a-z0-9]+$/i;
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [custPhone, setCustPhone] = useState('');
  const [mobileCartExpanded, setMobileCartExpanded] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = React.useRef<HTMLInputElement>(null);
  
  // Advanced Scan Buffer (Ref based for speed/precision)
  const scanBuffer = React.useRef<string>('');
  const lastCharTime = React.useRef<number>(0);
  const scanTimeout = React.useRef<any>(null);

  // Tab UI State
  const [showOpenTabModal, setShowOpenTabModal] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [isOpeningTab, setIsOpeningTab] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const [lastScanError, setLastScanError] = useState(false);
  
  // M-Pesa Transaction State
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaCodeInput, setMpesaCodeInput] = useState('');
  const [mpesaError, setMpesaError] = useState('');
  const [mpesaContext, setMpesaContext] = useState<{ type: 'checkout' | 'settle', tabId?: string } | null>(null);
  
  // Shift UI State
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [closeShiftStep, setCloseShiftStep] = useState(1); // 1: Tabs, 2: Sales, 3: Stock
  const [closingStockInput, setClosingStockInput] = useState<StockSnapshot[]>([]);

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


  const handleBarcodeScan = (code: string) => {
    if (!code.trim()) return;
    
    const product = products.find(p => 
      (p.barcode?.toUpperCase() === code.toUpperCase()) || 
      (p.productCode?.toUpperCase() === code.toUpperCase())
    );

    if (product) {
      if (product.stock > 0) {
        addToCart(product);
        setLastScannedId(product.id);
        setLastScanError(false);
        setTimeout(() => setLastScannedId(null), 500); 
        playBeep(800, 0.1, 0.1); 
        showToast(`${product.name} added`, 'success');
      } else {
        setLastScanError(true);
        setTimeout(() => setLastScanError(false), 500);
        playBeep(200, 0.3, 0.1); 
        showToast(`${product.name} is out of stock!`, 'warning');
      }
    } else {
      setLastScanError(true);
      setTimeout(() => setLastScanError(false), 500);
      playBeep(200, 0.3, 0.1);
      showToast("Product not found", 'error');
    }
    setBarcodeInput('');
    scanBuffer.current = '';
  };

  // Audio Feedback
  const playBeep = (freq = 800, duration = 0.1, volume = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) { console.warn("Beep failed", e); }
  };

  // ADVANCED GLOBAL SCANNER LISTENER
  React.useEffect(() => {
    if (activeView !== 'POS') return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Guard: Ignore if typing in a field
      const active = document.activeElement;
      const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      
      // But allow if it's our specific manual barcode input
      const isManualInput = active === barcodeRef.current;
      
      if (isInput && !isManualInput) return;

      const now = Date.now();
      const diff = now - lastCharTime.current;
      lastCharTime.current = now;

      // Reset timeout on every char
      if (scanTimeout.current) clearTimeout(scanTimeout.current);

      if (e.key === 'Enter') {
        if (scanBuffer.current.length > 2) {
          e.preventDefault();
          handleBarcodeScan(scanBuffer.current);
          scanBuffer.current = '';
        }
        return;
      }

      if (e.key.length === 1) {
        scanBuffer.current += e.key;
        
        // Auto-finalize if it looks like a scanner (fast arrival < 30ms)
        scanTimeout.current = setTimeout(() => {
          if (scanBuffer.current.length > 2 && diff < 30) { 
            handleBarcodeScan(scanBuffer.current);
            scanBuffer.current = '';
          }
        }, 80); 
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [products, addToCart]); // Re-bind on critical deps

  // Keep manual field focused as fallback
  React.useEffect(() => {
    if (activeView !== 'POS') return;
    const interval = setInterval(() => {
      const active = document.activeElement;
      if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
         barcodeRef.current?.focus();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeView]);

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
      const oldIndex = filteredProducts.findIndex((p) => p.id === active.id);
      const newIndex = filteredProducts.findIndex((p) => p.id === over?.id);
      const newFilteredOrder = arrayMove(filteredProducts, oldIndex, newIndex) as Product[];
      const productIds = new Set(newFilteredOrder.map(p => p.id));
      const remainingProducts = products.filter(p => !productIds.has(p.id));
      const combined = [...newFilteredOrder, ...remainingProducts];

      onReorder(combined);
    }
  };

  const handleCheckout = async (method: 'Cash' | 'Mpesa' | 'Card' | 'Pending') => {
    if (isUnverified) {
      showToast("Access Restricted: Verification Required", "warning");
      return;
    }
    
    if (method === 'Pending') {
      const sale = await onCheckout(method, custPhone);
      if (sale) {
        setLastSale(sale);
        setShowReceipt(true);
        setCustPhone('');
        showToast("Order sent to counter for verification", "success");
      }
      return;
    }

    // Role Guard: Waiters cannot process payments
    if (userRole === Role.WAITER) {
      showToast("Access Restricted: Waiters cannot process payments.", "error");
      return;
    }

    if (method === 'Mpesa') {
      setMpesaContext({ type: 'checkout' });
      setMpesaCodeInput('');
      setMpesaError('');
      setShowMpesaModal(true);
      return;
    }

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
    const message = `*RECEIPT: ${businessName}*%0A%0ATransaction ID: ${lastSale.id}%0ADate: ${new Date(lastSale.date).toLocaleString()}%0A%0AItems:%0A${itemsText}%0A%0A*TOTAL: Ksh ${lastSale.totalAmount.toLocaleString()}*%0APayment: ${lastSale.paymentMethod}${lastSale.mpesaCode ? `%0AM-Pesa Code: ${lastSale.mpesaCode}` : ''}%0A%0A_Thank you for your business!_`;
    const phone = lastSale.customerPhone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const handleOpenTab = async () => {
    if (!newTabName.trim()) return;
    if (isUnverified) {
      showToast("Access Restricted: Verification Required", "warning");
      return;
    }
    setIsOpeningTab(true);
    await onOpenTab(newTabName);
    setNewTabName('');
    setShowOpenTabModal(false);
    setIsOpeningTab(false);
  };

  const handleAddToTab = async (tabId: string) => {
    if (isUnverified) {
      showToast("Access Restricted: Verification Required", "warning");
      return;
    }
    if (cart.length === 0) return;
    await onAddCartToTab(tabId, cart);
    cart.forEach(i => removeFromCart(i.id));
    setMobileCartExpanded(false);
  };

  const handleSettleTab = async (tabId: string, method: 'Cash' | 'Mpesa' | 'Card') => {
    if (isUnverified) {
      showToast("Access Restricted", "warning");
      return;
    }
    
    if (userRole === Role.WAITER) {
      showToast("Access Restricted: Waiters cannot settle tabs.", "error");
      return;
    }

    if (method === 'Mpesa') {
      setMpesaContext({ type: 'settle', tabId });
      setMpesaCodeInput('');
      setMpesaError('');
      setShowMpesaModal(true);
      return;
    }

    setIsSettling(true);
    const sale = await onSettleTab(tabId, method);
    if (sale) {
      setLastSale(sale);
      setShowReceipt(true);
      showToast("Tab settled!", "success");
    }
    setIsSettling(false);
  };

  const handleConfirmMpesa = async () => {
    const code = mpesaCodeInput.trim().toUpperCase();
    const alphanumeric = /^[A-Z0-9]+$/;
    
    if (code.length < 8 || code.length > 12) {
      setMpesaError("Code must be 8-12 characters");
      return;
    }
    if (!alphanumeric.test(code)) {
      setMpesaError("Only letters and numbers allowed");
      return;
    }

    setShowMpesaModal(false);
    
    if (mpesaContext?.type === 'checkout') {
      const sale = await onCheckout('Mpesa', custPhone, code);
      if (sale) {
        setLastSale(sale);
        setShowReceipt(true);
        setCustPhone('');
        showToast("Sale successful!", "success");
      }
    } else if (mpesaContext?.type === 'settle' && mpesaContext.tabId) {
      setIsSettling(true);
      const sale = await onSettleTab(mpesaContext.tabId, 'Mpesa', code);
      if (sale) {
        setLastSale(sale);
        setShowReceipt(true);
        showToast("Tab settled!", "success");
      }
      setIsSettling(false);
    }
    setMpesaContext(null);
  };

  const handleCloseShiftStart = () => {
    if (isUnverified) {
      showToast("Access Restricted", "warning");
      return;
    }
    setClosingStockInput(products.map(p => ({
      productId: p.id,
      productName: p.name,
      quantity: p.stock
    })));
    setCloseShiftStep(1);
    setShowCloseShiftModal(true);
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
                {currentShift && (
                  <button
                    onClick={handleCloseShiftStart}
                    className="px-6 py-4 bg-white border border-slate-200 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all active:scale-95 flex items-center gap-3 shadow-sm"
                  >
                    <i className="fa-solid fa-power-off"></i> Close Shift
                  </button>
                )}
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Terminal</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 font-mono">
                  {currentShift ? `Active Shift: ${currentShift.id}` : 'Syncing Live Terminal...'}
                </p>
              </div>
              {currentShift && (
                <button
                  onClick={handleCloseShiftStart}
                  className="px-6 py-4 bg-white border border-slate-200 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all active:scale-95 flex items-center gap-3 shadow-sm"
                >
                  <i className="fa-solid fa-power-off"></i> Close Shift
                </button>
              )}
            </div>
            <div className="mb-2 lg:mb-8 space-y-3 lg:space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <i className="fa-solid fa-barcode absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-indigo-500 z-10"></i>
                  <input
                    ref={barcodeRef}
                    type="text"
                    placeholder="SCAN BARCODE HERE..."
                    className={`w-full pl-10 lg:pl-14 pr-4 lg:pr-6 py-3 lg:py-5 border-2 rounded-xl lg:rounded-[2rem] focus:ring-4 outline-none text-sm lg:text-lg font-black tracking-widest placeholder:text-indigo-300 transition-all ${
                        lastScanError 
                        ? 'bg-rose-50 border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' 
                        : 'bg-indigo-50 border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                    }`}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleBarcodeScan(barcodeInput);
                      }
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="hidden sm:block text-[8px] font-black text-indigo-400 uppercase tracking-widest">Active Scanner</span>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                </div>

                <div className="relative flex-1 group">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="text"
                    placeholder="Search by name..."
                    className="w-full pl-10 lg:pl-14 pr-4 lg:pr-6 py-3 lg:py-5 bg-white border border-slate-200 rounded-xl lg:rounded-[2rem] focus:outline-none shadow-sm text-sm lg:text-lg font-medium"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
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

            <div className="flex-1 overflow-auto pr-2 relative">
              {!currentShift && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center p-8 rounded-[3rem]">
                  <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-100 text-center max-w-md animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-8 shadow-xl shadow-indigo-100/50">
                      <i className="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-4">No Active Shift</h3>
                    <p className="text-sm text-slate-500 font-medium mb-10 leading-relaxed">
                      Please start a new shift to begin recording sales and tracking inventory movements.
                    </p>
                    <button
                      onClick={onStartShift}
                      className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl shadow-slate-200"
                    >
                      Start Business Shift
                    </button>
                  </div>
                </div>
              )}
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
            <div 
              key={item.id} 
              className={`flex gap-3 lg:gap-4 p-3 lg:p-4 bg-slate-50 rounded-[1.5rem] lg:rounded-[2rem] border transition-all ${
                lastScannedId === item.id ? 'border-indigo-500 bg-indigo-50 animate-flash shadow-lg shadow-indigo-100' : 'border-transparent hover:border-indigo-100'
              }`}
            >
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
            {userRole === Role.WAITER ? (
              <div className="col-span-3 space-y-4">
                <button 
                  onClick={() => cart.forEach(i => removeFromCart(i.id))}
                  className="w-full py-3 bg-white/10 text-white border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-rotate-right"></i> New Order
                </button>
                <div className="relative">
                  <i className="fa-solid fa-chair absolute left-4 top-1/2 -translate-y-1/2 text-orange-400"></i>
                  <input
                    type="text"
                    placeholder="TABLE # / CUSTOMER NAME"
                    className="w-full pl-10 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-orange-500 transition-all text-white placeholder:text-slate-600"
                    value={custPhone} // Reusing custPhone state for Table/Name as requested
                    onChange={e => setCustPhone(e.target.value)}
                  />
                </div>
                <button 
                  disabled={cart.length === 0} 
                  onClick={() => handleCheckout('Pending')} 
                  className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-[14px] uppercase tracking-[0.2em] border border-orange-500 hover:bg-orange-500 shadow-2xl shadow-orange-900/40 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 animate-pulse"
                >
                  Send to Counter <i className="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            ) : (
              <>
                <button disabled={cart.length === 0} onClick={() => handleCheckout('Cash')} className="py-4 bg-slate-800 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50">Cash</button>
                <button disabled={cart.length === 0} onClick={() => handleCheckout('Mpesa')} className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-50">M-Pesa</button>
                <button disabled={cart.length === 0} onClick={() => handleCheckout('Card')} className="col-span-3 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-900/40 transition-all active:scale-95 disabled:opacity-50">Card</button>
              </>
            )}

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
          <div className="grid grid-cols-3 gap-2">
            {userRole === 'WAITER' ? (
              <button
                disabled={cart.length === 0}
                onClick={(e) => { e.stopPropagation(); handleCheckout('Pending'); }}
                className="col-span-2 py-4 bg-orange-600 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1 shadow-xl shadow-orange-900/40"
              >
                <i className="fa-solid fa-paper-plane"></i>Send to Counter
              </button>
            ) : (
              <>
                <button
                  disabled={cart.length === 0}
                  onClick={(e) => { e.stopPropagation(); handleCheckout('Cash'); }}
                  className="py-4 bg-slate-800 rounded-xl font-black text-[9px] uppercase tracking-widest border border-slate-700 active:scale-95 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1"
                >
                  <i className="fa-solid fa-money-bills"></i>Cash
                </button>
                <button
                  disabled={cart.length === 0}
                  onClick={(e) => { e.stopPropagation(); handleCheckout('Mpesa'); }}
                  className="py-4 bg-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1"
                >
                  <i className="fa-solid fa-mobile-screen"></i>M-Pesa
                </button>
              </>
            )}
            <button
              disabled={cart.length === 0}
              onClick={(e) => { e.stopPropagation(); setMobileCartExpanded(true); setTimeout(() => document.getElementById('assign-to-tab-section')?.scrollIntoView({ behavior: 'smooth' }), 300); }}
              className="py-4 bg-orange-600 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1"
            >
              <i className="fa-solid fa-book-bookmark"></i>To Tab
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
                  <div 
                    key={item.id} 
                    className={`flex gap-3 p-3 bg-slate-50 rounded-2xl border transition-all ${
                      lastScannedId === item.id ? 'border-indigo-500 bg-indigo-50 animate-flash shadow-lg shadow-indigo-100' : 'border-transparent active:border-indigo-100'
                    }`}
                  >
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
                  <div id="assign-to-tab-section" className="pt-4 border-t border-slate-100">
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
                <div className="space-y-4">
                  {userRole === Role.WAITER ? (
                    <div className="space-y-3">
                       <button 
                        onClick={() => { cart.forEach(i => removeFromCart(i.id)); setMobileCartExpanded(false); }}
                        className="w-full py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <i className="fa-solid fa-rotate-right"></i> Reset Order
                      </button>
                      <div className="relative">
                        <i className="fa-solid fa-chair absolute left-4 top-1/2 -translate-y-1/2 text-orange-400"></i>
                        <input
                          type="text"
                          placeholder="TABLE / CUSTOMER"
                          className="w-full pl-11 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:border-orange-500 outline-none text-white"
                          value={custPhone}
                          onChange={e => setCustPhone(e.target.value)}
                        />
                      </div>
                      <button
                        disabled={cart.length === 0}
                        onClick={() => { handleCheckout('Pending'); setMobileCartExpanded(false); }}
                        className="w-full py-5 bg-orange-600 rounded-2xl font-black text-[14px] uppercase tracking-widest shadow-xl shadow-orange-900/40 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 animate-pulse"
                      >
                        Send to Counter <i className="fa-solid fa-paper-plane"></i>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
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
                        className="col-span-2 py-4 bg-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-900/40 active:scale-95 disabled:opacity-50 transition-all"
                      >
                        Card
                      </button>
                    </div>
                  )}
                  <button
                    disabled={cart.length === 0}
                    onClick={() => { document.getElementById('assign-to-tab-section')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="w-full py-4 bg-orange-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-900/40 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    To Tab
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

      {/* M-Pesa Transaction Modal */}
      {showMpesaModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[160] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-sm p-10 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 shadow-xl shadow-emerald-100">
              <i className="fa-solid fa-mobile-screen-button"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2 text-center">M-Pesa Payment</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 text-center">Enter Transaction Code</p>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block px-2">Transaction Code</label>
                <input
                  type="text"
                  className={`w-full bg-slate-50 border ${mpesaError ? 'border-rose-500' : 'border-slate-200'} rounded-2xl px-6 py-4 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase placeholder:text-slate-300`}
                  placeholder="e.g. QKT7A1S2B"
                  value={mpesaCodeInput}
                  onChange={e => {
                    setMpesaCodeInput(e.target.value.toUpperCase());
                    setMpesaError('');
                  }}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmMpesa()}
                />
                {mpesaError && <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mt-2 px-2">{mpesaError}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setShowMpesaModal(false); setMpesaContext(null); }} 
                  className="py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMpesa}
                  className="py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-100"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div id="receipt-modal" className="bg-white rounded-[4rem] w-full max-w-md p-10 shadow-2xl relative overflow-hidden animate-slide-up-mobile">
            {/* Design Accents */}
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-orange-400 to-amber-600"></div>
            <div className="absolute -right-16 -top-16 w-40 h-40 bg-orange-50 rounded-full blur-3xl opacity-50"></div>

            <div className="text-center mb-8 relative">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-emerald-100 rotate-6">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-2">
                {lastSale.paymentMethod === 'Pending' ? `Ticket #${lastSale.ticketNumber}` : 'Order Confirmed!'}
              </h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">{businessName} • {lastSale.paymentMethod === 'Pending' ? 'Waiter Ticket' : 'Digital Receipt'}</p>
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
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest no-print">
                  <span>Method</span>
                  <span className="text-orange-600">{lastSale.paymentMethod}</span>
                </div>
                {lastSale.mpesaCode && (
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest no-print">
                    <span>M-Pesa Code</span>
                    <span className="text-emerald-600 font-mono">{lastSale.mpesaCode}</span>
                  </div>
                )}
                {lastSale.mpesaCode && (
                  <div className="hidden print:flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>M-Pesa Code</span>
                    <span className="text-slate-900 font-mono">{lastSale.mpesaCode}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Total Pay</span>
                  <span className="text-2xl font-extrabold text-slate-900 tracking-tighter">Ksh {lastSale.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-4">
              {lastSale.paymentMethod === 'Pending' && (
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center mb-4">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Payment Required at Counter</p>
                  <p className="text-[9px] text-orange-400 font-bold leading-tight">Please present this ticket number to the cashier to complete your order.</p>
                </div>
              )}
              
              <button
                onClick={shareReceiptWhatsApp}
                className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black text-[12px] uppercase tracking-[0.2em] hover:bg-orange-700 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-orange-200 active:scale-95 no-print"
              >
                <i className="fa-brands fa-whatsapp text-xl"></i>
                Send to Customer
              </button>

              <div className="grid grid-cols-2 gap-4 no-print">
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

      {/* Shift Closing Modal */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] w-full max-w-lg p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Close Shift</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                  Step {closeShiftStep} of 3: {closeShiftStep === 1 ? 'Open Tabs' : closeShiftStep === 2 ? 'Sales Summary' : 'Stock Reconciliation'}
                </p>
              </div>
              <button 
                onClick={() => setShowCloseShiftModal(false)}
                className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar mb-8">
              {closeShiftStep === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-lg">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                      </div>
                      <h4 className="font-black text-orange-900 uppercase text-xs tracking-tight">Open Tabs Detected</h4>
                    </div>
                    <p className="text-xs text-orange-700 font-medium leading-relaxed">
                      The following tabs are still open. They will be transferred to the next shift and will NOT count towards this shift's totals.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {tabs.filter(t => t.status === 'OPEN').map(tab => (
                      <div key={tab.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-xs font-black text-slate-700 uppercase">{tab.customerName}</span>
                        <span className="text-sm font-black text-slate-900 tracking-tighter">Ksh {tab.totalAmount.toLocaleString()}</span>
                      </div>
                    ))}
                    {tabs.filter(t => t.status === 'OPEN').length === 0 && (
                      <p className="text-center py-10 text-slate-300 font-bold uppercase tracking-widest text-[10px]">No Open Tabs</p>
                    )}
                  </div>
                </div>
              )}

              {closeShiftStep === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Items in Cart</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tighter">{cart.length}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active View</p>
                      <p className="text-2xl font-black text-indigo-600 tracking-tighter uppercase">{activeView}</p>
                    </div>
                  </div>
                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.3em]">Shift Sale Totals</p>
                      <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[8px] font-black uppercase tracking-widest">Live Estimate</span>
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-400">Cash:</span>
                          <span className="font-black">Ksh {sales.filter(s => s.shiftId === currentShift?.id && s.paymentMethod === 'Cash').reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-400">M-Pesa:</span>
                          <span className="font-black">Ksh {sales.filter(s => s.shiftId === currentShift?.id && s.paymentMethod === 'Mpesa').reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}</span>
                       </div>
                       <div className="h-px bg-slate-800 my-4"></div>
                       <div className="flex justify-between items-end">
                          <span className="text-sm font-black text-indigo-400 uppercase tracking-wider">Total Sales:</span>
                          <span className="text-3xl font-black tracking-tighter">Ksh {sales.filter(s => s.shiftId === currentShift?.id).reduce((sum, s) => sum + s.totalAmount, 0).toLocaleString()}</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {closeShiftStep === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                    <i className="fa-solid fa-list-check text-indigo-600"></i>
                    <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-tight">Verify Physical Stock Matches System Count</p>
                  </div>
                  <div className="space-y-2">
                    {closingStockInput.map((item, idx) => (
                      <div key={item.productId} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-[11px] font-black text-slate-700 uppercase truncate block">{item.productName}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">System expects: {products.find(p => p.id === item.productId)?.stock || 0}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => {
                              const newStock = [...closingStockInput];
                              newStock[idx].quantity = Math.max(0, newStock[idx].quantity - 1);
                              setClosingStockInput(newStock);
                            }}
                            className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 active:scale-90 transition-all shadow-sm"
                          >
                            <i className="fa-solid fa-minus text-[10px]"></i>
                          </button>
                          <input 
                            type="number"
                            className="w-12 bg-transparent text-center font-black text-slate-900 outline-none text-sm"
                            value={item.quantity}
                            onChange={(e) => {
                              const newStock = [...closingStockInput];
                              newStock[idx].quantity = parseInt(e.target.value) || 0;
                              setClosingStockInput(newStock);
                            }}
                          />
                          <button 
                            onClick={() => {
                              const newStock = [...closingStockInput];
                              newStock[idx].quantity += 1;
                              setClosingStockInput(newStock);
                            }}
                            className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 active:scale-90 transition-all shadow-sm"
                          >
                            <i className="fa-solid fa-plus text-[10px]"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 shrink-0">
              {closeShiftStep > 1 ? (
                <button 
                  onClick={() => setCloseShiftStep(prev => prev - 1)} 
                  className="py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  <i className="fa-solid fa-arrow-left mr-2"></i> Back
                </button>
              ) : (
                <button 
                  onClick={() => setShowCloseShiftModal(false)} 
                  className="py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                >
                  Discard
                </button>
              )}
              
              {closeShiftStep < 3 ? (
                <button 
                  onClick={() => setCloseShiftStep(prev => prev + 1)} 
                  className="py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 active:scale-95 shadow-xl shadow-slate-200 transition-all"
                >
                  Next Step <i className="fa-solid fa-arrow-right ml-2"></i>
                </button>
              ) : (
                <button 
                  onClick={() => { onCloseShift(closingStockInput); setShowCloseShiftModal(false); }}
                  className="py-5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 active:scale-95 shadow-xl shadow-rose-200 transition-all"
                >
                  <i className="fa-solid fa-check-double mr-2"></i> Finalize
                </button>
              )}
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
        @keyframes flash {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .animate-flash { animation: flash 0.4s ease-out; }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #receipt-modal, #receipt-modal * { visibility: visible; }
          #receipt-modal { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default POS;
