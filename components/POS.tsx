import React, { useState, useMemo } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

const SortableProduct: React.FC<{ product: Product; toggleFavorite: (id: string) => void; addToCart: (p: Product) => void; isFavorite: boolean }> = ({ product, toggleFavorite, addToCart, isFavorite }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab'
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative group">
      <button
        onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }}
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center"
      >
        <i className={`fa-solid ${isFavorite ? 'fa-star text-yellow-400' : 'fa-star text-slate-300'}`}></i>
      </button>

      <div
        onClick={() => product.stock > 0 && addToCart(product)}
        className={`bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer ${product.stock <= 0 ? 'opacity-60 grayscale' : ''}`}
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
    </div>
  );
};

const POS: React.FC<POSProps> = ({ products, addToCart, cart, updateCartQuantity, removeFromCart, onCheckout, businessName }) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [custPhone, setCustPhone] = useState('');
  const [mobileCartExpanded, setMobileCartExpanded] = useState(false);

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

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  }), [products, search, activeCategory]);

  const favoriteProducts = useMemo(() => favorites.map(id => filteredProducts.find(p => p.id === id)).filter(Boolean) as Product[], [favorites, filteredProducts]);
  const availableFavorites = favoriteProducts.filter(p => p.stock > 0);
  const nonFavoriteProducts = useMemo(() => filteredProducts.filter(p => !favorites.includes(p.id) && p.stock > 0), [filteredProducts, favorites]);
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

  // DnD Kit
  const sensors = useSensors(useSensor(PointerSensor));
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = favorites.indexOf(active.id);
      const newIndex = favorites.indexOf(over.id);
      const newFavorites = arrayMove(favorites, oldIndex, newIndex);
      setFavorites(newFavorites);
      localStorage.setItem('pos_favorites', JSON.stringify(newFavorites));
    }
  };

  return (
    <div className="flex h-full flex-col lg:flex-row gap-4 lg:gap-8 pb-32 lg:pb-0">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search & Categories */}
        <div className="mb-4 lg:mb-8 space-y-4">
          <div className="relative group">
            <i className="fa-solid fa-magnifying-glass absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-12 lg:pl-14 pr-4 lg:pr-6 py-4 lg:py-5 bg-white border border-slate-200 rounded-2xl lg:rounded-[2rem] focus:outline-none shadow-sm text-lg font-medium"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-auto pr-2">
          {/* Favorites Drag-and-Drop */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={availableFavorites.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                {availableFavorites.map(p => (
                  <SortableProduct key={p.id} product={p} toggleFavorite={toggleFavorite} addToCart={addToCart} isFavorite={true} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Non-Favorite Products */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {nonFavoriteProducts.map(p => (
              <SortableProduct key={p.id} product={p} toggleFavorite={toggleFavorite} addToCart={addToCart} isFavorite={false} />
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Checkout Panel */}
      <div className="hidden lg:flex w-full lg:w-[26rem] flex-col shrink-0 sticky top-4 h-[calc(100vh-2rem)]">
        <div className="bg-white border border-slate-200 rounded-[3rem] shadow-2xl flex flex-col overflow-hidden flex-1">
          {/* Cart & Checkout inside */}
          {/* ...reuse your current desktop cart JSX here... */}
        </div>
      </div>
    </div>
  );
};

export default POS;
