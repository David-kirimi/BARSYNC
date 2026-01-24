import React, { useEffect, useState } from 'react';
import { Product, Sale, User, View, CartItem, Role } from './types';
import { PRODUCT_TEMPLATES } from './constants';
import POS from './components/POS';
import Inventory from './components/Inventory';
import SalesHistory from './components/SalesHistory';
import Sidebar from './components/Sidebar';
import { ToastProvider, useToast } from './components/Toast';
import Login from './components/Login';

/* -------------------- STORAGE KEYS -------------------- */
const STORAGE_KEYS = {
  PRODUCTS: 'pos_products_v2_safe', // Version bump to force fresh load logic if needed
  SALES: 'pos_sales_v1',
  USERS: 'pos_users_v1',
  VIEW: 'pos_current_view_v1',
};

/* -------------------- HELPERS -------------------- */
const now = () => new Date().toISOString();

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Merges two datasets based on ID and updatedAt timestamp.
 * - If an item exists in both, the one with the NEWER updatedAt wins.
 * - If an item exists in only one, it is kept.
 */
function mergeDatasets<T extends { id: string; updatedAt: string }>(local: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();

  // 1. Load all local items first
  local.forEach(item => map.set(item.id, item));

  // 2. Merge incoming items
  incoming.forEach(item => {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const localTime = new Date(existing.updatedAt).getTime();
      const incomingTime = new Date(item.updatedAt).getTime();
      if (incomingTime > localTime) {
        map.set(item.id, item);
      }
    }
  });

  return Array.from(map.values());
}

/* -------------------- PRODUCT INIT -------------------- */
function initializeProducts(): Product[] {
  // 1. Try to load existing local data
  const stored = loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);

  // 2. Prepare Template Data (as if it came from "cloud" or "factory reset")
  const templates: Product[] = PRODUCT_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    price: t.defaultPrice,
    stock: 0,
    openingStock: 0,
    additions: 0,
    imageUrl: t.imageUrl,
    createdAt: now(), // New fields
    updatedAt: now(),
  }));

  // 3. If storage is empty, use templates. 
  //    If storage exists, merge templates (in case we added new ones to constants.tsx) 
  //    BUT existing local data with *same IDs* will likely be older than 'now()' so we must be careful.
  //    Actually, for "first run" templates, we usually only want them if we have NOTHING.
  //    
  //    However, to be robust:
  //    If we have NO stored data -> return Templates.
  //    If we DO have stored data -> Return stored data. (Do NOT over-merge templates every reload, 
  //    because templates have 'now()' which would overwrite user changes if we aren't careful about ID matching).

  if (stored.length > 0) {
    return stored;
  }

  // First time load
  saveToStorage(STORAGE_KEYS.PRODUCTS, templates);
  return templates;
}

/* -------------------- MAIN APP CONTENT -------------------- */
const AppContent: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>(() =>
    loadFromStorage<View>(STORAGE_KEYS.VIEW, 'POS')
  );

  const [products, setProducts] = useState<Product[]>(() =>
    initializeProducts()
  );

  const [sales, setSales] = useState<Sale[]>(() =>
    loadFromStorage<Sale[]>(STORAGE_KEYS.SALES, [])
  );

  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage<User[]>(STORAGE_KEYS.USERS, [])
  );

  const [cart, setCart] = useState<CartItem[]>([]);

  /* -------------------- PERSISTENCE -------------------- */
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VIEW, view);
  }, [view]);

  useEffect(() => {
    // Determine if we need to save. 
    // In a real app with cloud sync, here we would also trigger a 
    // "pushToCloud" if the data changed.
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  }, [products]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SALES, sales);
  }, [sales]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.USERS, users);
  }, [users]);

  /* -------------------- CART LOGIC -------------------- */
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty };
    }));
  };

  /* -------------------- MUTATIONS -------------------- */
  const onCheckout = (method: 'Cash' | 'Mpesa', customerPhone?: string): Sale | undefined => {
    if (cart.length === 0) return undefined;

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      businessId: currentUser?.businessId || 'offline_biz',
      date: now(),
      items: cart,
      totalAmount,
      paymentMethod: method,
      salesPerson: currentUser?.name || 'Unknown',
      customerPhone,
    };

    // Update Sales
    setSales(prev => [newSale, ...prev]);

    // Update Stock
    setProducts(prev =>
      prev.map(p => {
        const item = cart.find(i => i.id === p.id);
        if (!item) return p;
        return {
          ...p,
          stock: Math.max(0, p.stock - item.quantity),
          updatedAt: now(), // CRITAL: Update timestamp
        };
      })
    );

    // Clear Cart
    setCart([]);
    return newSale;
  };

  const handleProductUpdate = (updated: Product) => {
    // When manually updating, force new timestamp
    const productWithTimestamp = { ...updated, updatedAt: now() };

    setProducts(prev =>
      prev.map(p => p.id === updated.id ? productWithTimestamp : p)
    );
  };

  const handleProductAdd = (newProductData: Omit<Product, 'id' | 'openingStock' | 'additions' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...newProductData,
      id: Math.random().toString(36).substr(2, 9),
      openingStock: newProductData.stock,
      additions: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    setProducts(prev => [...prev, newProduct]);
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} backendUrl="" />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={view}
          setView={setView}
          user={currentUser}
          onLogout={() => setCurrentUser(null)}
          offline={false}
          onSync={() => { }}
          isSyncing={false}
          lastSync={null}
          backendAlive={true}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 scroll-smooth" id="main-scroll">
            <div className="max-w-[1600px] mx-auto h-full">
              {view === 'POS' && (
                <POS
                  products={products}
                  addToCart={addToCart}
                  cart={cart}
                  updateCartQuantity={updateCartQuantity}
                  removeFromCart={removeFromCart}
                  onCheckout={onCheckout}
                  businessName="BarSync POS"
                />
              )}

              {view === 'INVENTORY' && (
                <Inventory
                  products={products}
                  onUpdate={handleProductUpdate}
                  onAdd={handleProductAdd}
                  userRole={currentUser.role}
                />
              )}

              {view === 'SALES' && (
                <SalesHistory sales={sales} />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
