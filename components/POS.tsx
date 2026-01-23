import React, { useState, useMemo } from "react";
import { Product, CartItem, Sale } from "../types";
import { CATEGORIES } from "../constants";
import { useToast } from "./Toast";

interface POSProps {
  products: Product[];
  addToCart: (product: Product) => void;
  cart: CartItem[];
  updateCartQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  onCheckout: (method: "Cash" | "Mpesa", customerPhone?: string) => Sale | undefined;
  businessName: string;
}

const POS: React.FC<POSProps> = ({
  products,
  addToCart,
  cart,
  updateCartQuantity,
  removeFromCart,
  onCheckout,
  businessName,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [custPhone, setCustPhone] = useState("");
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  // Filter products for terminal (hide out-of-stock)
  const filteredProducts = useMemo(() => {
    return products
      .filter(
        (p) =>
          p.stock > 0 &&
          (activeCategory === "All" || p.category === activeCategory) &&
          p.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const aFav = favorites.includes(a.id) ? 0 : 1;
        const bFav = favorites.includes(b.id) ? 0 : 1;
        return aFav - bFav; // favorites first
      });
  }, [products, search, activeCategory, favorites]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleCheckout = (method: "Cash" | "Mpesa") => {
    const sale = onCheckout(method, custPhone);
    if (sale) {
      setLastSale(sale);
      setCustPhone("");
      showToast("Sale successful!", "success");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-8 p-4 lg:p-8">
      {/* Terminal Section */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search & Categories */}
        <div className="mb-4 lg:mb-8 space-y-4">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input
              type="text"
              placeholder="Search products..."
              className="w-full pl-12 pr-4 py-3 lg:py-4 rounded-2xl border border-slate-200 shadow-sm focus:outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat
                    ? "bg-slate-900 text-white shadow-lg"
                    : "bg-white text-slate-500 border border-slate-200"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-auto pr-2 pb-40">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="relative group">
                {/* Product Card */}
                <div
                  onClick={() => addToCart(product)}
                  className={`bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer ${product.stock <= 0 ? "opacity-50 filter grayscale" : ""
                    }`}
                >
                  <div className="h-32 lg:h-40 overflow-hidden relative">
                    <img
                      src={product.imageUrl || "https://via.placeholder.com/400?text=No+Image"}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {product.stock < 10 && (
                      <div className="absolute top-2 left-2 bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase">
                        Low: {product.stock}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-black text-slate-800 mb-1 leading-tight h-8 line-clamp-2 uppercase text-[12px] tracking-tight">
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm lg:text-md font-black text-indigo-600">
                        Ksh {product.price}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <i className="fa-solid fa-plus text-xs"></i>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Favorite Star */}
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${favorites.includes(product.id) ? "bg-yellow-400" : "bg-slate-400"
                    }`}
                >
                  ★
                </button>

                {/* Optional Checkbox for touch selection */}
                <input
                  type="checkbox"
                  checked={favorites.includes(product.id)}
                  onChange={() => toggleFavorite(product.id)}
                  className="absolute bottom-2 left-2 w-4 h-4"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Checkout Section */}
        <div className="fixed bottom-0 left-0 right-0 lg:static lg:w-[26rem] bg-white border-t lg:border lg:rounded-[3rem] shadow-2xl p-4 lg:p-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Total Pay</span>
            <span className="text-2xl lg:text-4xl font-black tracking-tighter">Ksh {cartTotal.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={cart.length === 0}
              onClick={() => handleCheckout("Cash")}
              className="py-4 bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              Cash
            </button>
            <button
              disabled={cart.length === 0}
              onClick={() => handleCheckout("Mpesa")}
              className="py-4 bg-emerald-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-900/40 transition-all active:scale-95 disabled:opacity-50"
            >
              M-Pesa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
