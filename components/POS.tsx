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

const POS: React.FC<POSProps> = ({
  products,
  addToCart,
  cart,
  updateCartQuantity,
  removeFromCart,
  onCheckout,
  businessName
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [custPhone, setCustPhone] = useState('');
  const [mobileCartExpanded, setMobileCartExpanded] = useState(false);

  // Favorites management with localStorage persistence
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pos_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      let updated;
      if (prev.includes(productId)) {
        updated = prev.filter(id => id !== productId);
        showToast("Removed from favorites", "info");
      } else {
        updated = [...prev, productId];
        showToast("Added to favorites", "success");
      }
      localStorage.setItem('pos_favorites', JSON.stringify(updated));
      return updated;
    });
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  // Split products into favorites (first) and others
  const favoriteProducts = useMemo(() => {
    return favorites
      .map(id => filteredProducts.find(p => p.id === id))
      .filter(Boolean) as Product[];
  }, [favorites, filteredProducts]);

  const availableFavorites = favoriteProducts.filter(p => p.stock > 0); // hide OOS
  const nonFavoriteProducts = useMemo(() => {
    return filteredProducts.filter(p => !favorites.includes(p.id) && p.stock > 0);
  }, [filteredProducts, favorites]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

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
    <div className="flex h-full flex-col lg:flex-row gap-4 lg:gap-8 pb-32 lg:pb-0">
      {/* Left Panel */}
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

        {/* Products Grid */}
        <div className="flex-1 overflow-auto pr-2">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {availableFavorites.map(product => (
              <div key={product.id} className="relative group">
                {/* Favorite Star */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center"
                  title={favorites.includes(product.id) ? "Unfavorite" : "Favorite"}
                >
                  <i className={`fa-solid ${favorites.includes(product.id) ? 'fa-star text-yellow-400' : 'fa-star text-slate-300'}`}></i>
                </button>

                <div
                  onClick={() => addToCart(product)}
                  className={`bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer`}
                >
                  <div className="h-32 lg:h-40 overflow-hidden relative">
                    <img
                      src={product.imageUrl || 'https://via.placeholder.com/400?text=No+Image'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
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
              </div>
            ))}

            {nonFavoriteProducts.map(product => (
              <div key={product.id} className="relative group">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center"
                  title={favorites.includes(product.id) ? "Unfavorite" : "Favorite"}
                >
                  <i className={`fa-solid ${favorites.includes(product.id) ? 'fa-star text-yellow-400' : 'fa-star text-slate-300'}`}></i>
                </button>

                <div
                  onClick={() => product.stock > 0 && addToCart(product)}
                  className={`bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer ${product.stock <= 0 ? 'opacity-60 grayscale' : ''}`}
                >
                  <div className="h-32 lg:h-40 overflow-hidden relative">
                    <img
                      src={product.imageUrl || 'https://via.placeholder.com/400?text=No+Image'}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
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
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Cart & Checkout (Desktop + Mobile) */}
      {/* ...keep your current cart & checkout code ... */}

      {/* Receipt Modal */}
      {/* ...keep your current receipt modal code ... */}

      <style>{`
        @keyframes slide-up-mobile { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up-mobile { animation: slide-up-mobile 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
    </div>
  );
};

export default POS;
