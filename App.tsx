import React, { useEffect, useState } from 'react';
import { Product, Sale, User, View, CartItem, Role } from './types';
import { PRODUCT_TEMPLATES } from './constants';
import POS from './components/POS';
import Inventory from './components/Inventory';
import SalesHistory from './components/SalesHistory';
import Sidebar from './components/Sidebar';
import { ToastProvider, useToast } from './components/Toast';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import UserManagement from './components/UserManagement';
import Reports from './components/Reports';
import Profile from './components/Profile';
import AuditLogs from './components/AuditLogs';
import SubscriptionTerminal from './components/SubscriptionTerminal';
import SuperAdminPortal from './components/SuperAdminPortal';

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

  if (stored && stored.length > 0) {
    return stored;
  }

  // Double check: If localStorage key exists but is empty array, it might be intentional
  // BUT if key "pos_products_v2_safe" is completely missing, then it's a fresh install.
  const rawCheck = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (rawCheck) {
    const parsed = JSON.parse(rawCheck);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }

  // First time load
  console.log('Initializing with default templates...');
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

  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const [sales, setSales] = useState<Sale[]>(() =>
    loadFromStorage<Sale[]>(STORAGE_KEYS.SALES, [])
  );

  const [users, setUsers] = useState<User[]>(() =>
    loadFromStorage<User[]>(STORAGE_KEYS.USERS, [])
  );

  // New State for Business and Audit Logs
  const [business, setBusiness] = useState<any>(() =>
    loadFromStorage<any>('pos_business_v1', {
      id: 'local_biz',
      name: 'My Bar',
      ownerName: 'Admin',
      mongoDatabase: '',
      mongoCollection: '',
      subscriptionStatus: 'Trial',
      subscriptionPlan: 'Basic',
      paymentStatus: 'Pending',
      createdAt: now(),
      updatedAt: now()
    })
  );

  const [auditLogs, setAuditLogs] = useState<any[]>(() =>
    loadFromStorage<any[]>('pos_audit_logs_v1', [])
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
    if (products.length > 0) {
      saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    }
  }, [products]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SALES, sales);
  }, [sales]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.USERS, users);
  }, [users]);

  // Persist new state
  useEffect(() => {
    saveToStorage('pos_business_v1', business);
  }, [business]);

  useEffect(() => {
    saveToStorage('pos_audit_logs_v1', auditLogs);
  }, [auditLogs]);

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

  /* -------------------- SYNC & REFRESH -------------------- */
  const reloadData = () => {
    setProducts(loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []));
    setSales(loadFromStorage<Sale[]>(STORAGE_KEYS.SALES, []));
    setUsers(loadFromStorage<User[]>(STORAGE_KEYS.USERS, []));
    setBusiness(loadFromStorage<any>('pos_business_v1', business)); // Keep fallback
    setAuditLogs(loadFromStorage<any[]>('pos_audit_logs_v1', []));
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Auto-refresh when another tab updates storage
      if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
        reloadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSync = () => {
    // Simulate cloud sync or just force local reload
    reloadData();
    return new Promise<void>((resolve) => setTimeout(resolve, 1000));
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

  const handleProductReorder = (newOrder: Product[]) => {
    setProducts(newOrder);
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
    return (
      <Login

        onLogin={(user, biz) => {
          setCurrentUser(user);
          if (biz) setBusiness(biz);
          // If business ID matches demo or manual check, set offline. 
          // Simpler: Check if we are "demo_user" which comes from offline mode
          if (user.id === 'demo_user' || user.businessId === 'bus_demo') {
            setIsOfflineMode(true);
          } else {
            setIsOfflineMode(false);
          }
        }}
        backendUrl=""
      />
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={view}
          setView={setView}
          user={currentUser}
          business={business}
          onLogout={() => setCurrentUser(null)}
          offline={isOfflineMode}
          onSync={handleSync}
          isSyncing={false}
          lastSync={now()} // Just to show recent
          backendAlive={true}
        />

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 scroll-smooth" id="main-scroll">
            <div className="max-w-[1600px] mx-auto h-full">
              {/* DASHBOARD / ANALYTICS */}
              {(view === 'ANALYTICS' || view === 'POS' && false) && (
                <Dashboard sales={sales} products={products} />
              )}

              {view === 'POS' && (
                <POS
                  products={products}
                  addToCart={addToCart}
                  cart={cart}
                  updateCartQuantity={updateCartQuantity}
                  removeFromCart={removeFromCart}
                  onCheckout={onCheckout}
                  businessName={business.name}
                  onReorder={handleProductReorder}
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

              {view === 'USER_MANAGEMENT' && (
                <UserManagement
                  users={users}
                  onAdd={(newUser) => {
                    const exists = users.some(u => u.name.toLowerCase() === newUser.name.toLowerCase());
                    if (exists) {
                      alert("User with this name already exists!"); // Simple check, Toast would be better but props not drilling
                      return;
                    }
                    const userWithId: User = { ...newUser, id: Math.random().toString(36).substr(2, 9), businessId: business.id || 'local_biz', status: 'Active', updatedAt: now() };
                    setUsers(prev => [...prev, userWithId]);
                  }}
                  onUpdate={(updatedUser) => {
                    setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...updatedUser, updatedAt: now() } : u));
                  }}
                  onDelete={(id) => {
                    setUsers(prev => prev.filter(u => u.id !== id));
                  }}
                />
              )}

              {view === 'REPORTS' && (
                <Reports sales={sales} />
              )}

              {view === 'PROFILE' && (
                <Profile user={currentUser} onUpdate={(u) => setCurrentUser(u)} />
              )}

              {view === 'AUDIT_LOGS' && (
                <AuditLogs logs={auditLogs} />
              )}

              {view === 'SUBSCRIPTION' && (
                <SubscriptionTerminal
                  business={business}
                  onUpdateStatus={(status, note) => {
                    setBusiness((prev: any) => ({
                      ...prev,
                      subscriptionStatus: status,
                      verificationNote: note,
                      updatedAt: now()
                    }));
                  }}
                />
              )}

              {view === 'SUPER_ADMIN_PORTAL' && (
                <SuperAdminPortal />
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
