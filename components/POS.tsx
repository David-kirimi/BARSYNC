import React, { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Product, CartItem, Sale } from "../types";
import { CATEGORIES } from "../constants";
import { useToast } from "./Toast";

// Sortable item wrapper
const SortableProduct: React.FC<{
  product: Product;
  addToCart: (product: Product) => void;
}> = ({ product, addToCart }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: product.stock <= 0 ? 0.5 : 1,
    filter: product.stock <= 0 ? "grayscale(80%)" : "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => product.stock > 0 && addToCart(product)}
      className="group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer"
    >
      <div className="h-32 lg:h-40 overflow-hidden relative">
        <img
          src={product.imageUrl || "https://via.placeholder.com/400?text=No+Image"}
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
  );
};

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
  const [favorites, setFavorites] = useState<string[]>([]); // store favorite product IDs
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [custPhone, setCustPhone] = useState("");

  const sensors = useSensors(useSensor(PointerSensor));

  // Filter products
  const filteredProducts = useMemo(() => {
    return products
      .filter(
        (p) =>
          (activeCategory === "All" || p.category === activeCategory) &&
          p.name.toLowerCase().includes(search.toLowerCase()) &&
          p.stock > 0
      )
      .sort((a, b) => {
        // favorites appear first
        const aFav = favorites.includes(a.id) ? 0 : 1;
        const bFav = favorites.includes(b.id) ? 0 : 1;
        return aFav - bFav;
      });
  }, [products, search, activeCategory, favorites]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const handleCheckout = (method: "Cash" | "Mpesa") => {
    const sale = onCheckout(method, custPhone);
    if (sale) {
      setLastSale(sale);
      setCustPhone("");
      showToast("Sale successful!", "success");
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = favorites.indexOf(active.id);
      const newIndex = favorites.indexOf(over.id);
      const newFavs = arrayMove(favorites, oldIndex, newIndex);
      setFavorites(newFavs);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 lg:gap-8">
      {/* Product terminal */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Search & Categories */}
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

        {/* Product list */}
        <div className="flex-1 overflow-auto pr-2 pb-40">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={favorites} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="relative">
                    <SortableProduct product={product} addToCart={addToCart} />
                    <button
                      onClick={() => toggleFavorite(product.id)}
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${favorites.includes(product.id) ? "bg-yellow-400" : "bg-slate-400"
                        }`}
                    >
                      ★
                    </button>
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Sticky checkout */}
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
