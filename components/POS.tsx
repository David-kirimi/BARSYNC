
import React, { useState, useMemo } from 'react';
import { Product, CartItem, Sale } from '../types';
import { CATEGORIES } from '../constants';
import { useToast } from './Toast';

interface POSProps {
  products: Product[];
  addToCart: (product: Product) => void;
  cart: CartItem[];
  updateCartQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  onCheckout: (method: 'Cash' | 'Mpesa', customerPhone?: string) => Sale | undefined;
  businessName: string;
}

const POS: React.FC<POSProps> = ({ products, addToCart, cart, updateCartQuantity, removeFromCart, onCheckout, businessName }) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [custPhone, setCustPhone] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

  const handleCheckout = (method: 'Cash' | 'Mpesa') => {
    const sale = onCheckout(method, custPhone);
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

  return (
    <div className="flex h-full flex-col lg:flex-row gap-4 lg:gap-8 pb-16 md:pb-0">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-4 lg:mb-8 space-y-4">
          <div className="relative group">
            <i className="fa-solid fa-magnifying-glass absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-12 lg:pl-14 pr-4 lg:pr-6 py-4 lg:py-5 bg-white border border-slate-200 rounded-2xl lg:rounded-[2rem] focus:outline-none shadow-sm text-lg font-medium"
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
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => product.stock > 0 && addToCart(product)}
                className={`group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer relative ${product.stock <= 0 ? 'opacity-60 grayscale' : ''
                  }`}
              >
                <div className="h-32 lg:h-40 overflow-hidden relative">
                  <img src={product.imageUrl || 'https://via.placeholder.com/400?text=No+Image'} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  {product.stock < 10 && product.stock > 0 && (
                    <div className="absolute top-2 left-2 bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">
                      Low: {product.stock}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-black text-slate-800 mb-1 leading-tight h-8 line-clamp-2 uppercase text-[12px] tracking-tight">{product.name}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm lg:text-md font-black text-indigo-600">Ksh {product.price}</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <i className="fa-solid fa-plus text-xs"></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[26rem] bg-white border border-slate-200 rounded-[2rem] lg:rounded-[3rem] shadow-2xl flex flex-col shrink-0 overflow-hidden mt-4 lg:mt-0 max-h-[500px] lg:max-h-full">
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
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <button disabled={cart.length === 0} onClick={() => handleCheckout('Cash')} className="py-4 bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50">Cash</button>
            <button disabled={cart.length === 0} onClick={() => handleCheckout('Mpesa')} className="py-4 bg-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-50">M-Pesa</button>
          </div>
        </div>
      </div>

      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Success!</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Transaction Completed</p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 space-y-4 mb-8">
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Total Amount</span>
                <span>Ksh {lastSale.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Payment</span>
                <span className="text-emerald-600">{lastSale.paymentMethod}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={shareReceiptWhatsApp}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-200"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i>
                Send to WhatsApp
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
