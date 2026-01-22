
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { INITIAL_PRODUCTS } from './constants.tsx';
import { Product, Sale, User, Role, View, CartItem, Business, AuditLog } from './types.ts';
import { useToast } from './components/Toast.tsx';
import Sidebar from './components/Sidebar.tsx';
import POS from './components/POS.tsx';
import Inventory from './components/Inventory.tsx';
import SalesHistory from './components/SalesHistory.tsx';
import Dashboard from './components/Dashboard.tsx';
import Login from './components/Login.tsx';
import SuperAdminPortal from './components/SuperAdminPortal.tsx';
import UserManagement from './components/UserManagement.tsx';
import Reports from './components/Reports.tsx';
import Profile from './components/Profile.tsx';
import AuditLogs from './components/AuditLogs.tsx';

// Using empty string for relative paths in unified repo
const GLOBAL_BACKEND = '';

const App: React.FC = () => {
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('bar_pos_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentView, setCurrentView] = useState<View>('POS');
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendAlive, setBackendAlive] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('bar_pos_last_sync'));

  const isInitialLoad = useRef(true);

  const addLog = useCallback((action: string, details: string, userOverride?: User) => {
    const user = userOverride || currentUser;
    if (!user) return;
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      timestamp: new Date().toISOString(),
      userId: user.id,
      userName: user.name,
      action,
      details,
      businessId: user.businessId
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [currentUser]);

  const syncWithCloud = useCallback(async (isSilent = false) => {
    if (!navigator.onLine) {
      if (!isSilent) console.warn("Offline: Sync skipped.");
      return;
    }

    if (!isSilent) setIsSyncing(true);

    try {
      const response = await fetch(`${GLOBAL_BACKEND}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentUser?.businessId || 'admin_node',
          businessName: 'Business Node',
          data: { sales, products, auditLogs, users: allUsers }
        })
      });

      if (response.ok) {
        const now = new Date().toLocaleString();
        setLastSync(now);
        localStorage.setItem('bar_pos_last_sync', now);
        if (!isSilent) console.log("Cloud Sync Success.");
      }
    } catch (error) {
      console.error("Sync Failure:", error);
    } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, [currentUser, products, sales, auditLogs, allUsers]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (currentUser && backendAlive) {
      const timer = setTimeout(() => {
        syncWithCloud(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [products, sales, auditLogs, allUsers, currentUser, backendAlive, syncWithCloud]);

  useEffect(() => {
    if (currentUser?.role === Role.SUPER_ADMIN) {
      fetch(`${GLOBAL_BACKEND}/api/admin/businesses`)
        .then(res => res.json())
        .then(data => setBusinesses(data))
        .catch(err => console.error("Business fetch fail", err));
    }
  }, [currentUser]);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${GLOBAL_BACKEND}/health`);
        setBackendAlive(res.ok);
      } catch { setBackendAlive(false); }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (user: User, business?: Business, initialState?: any) => {
    setCurrentUser(user);
    localStorage.setItem('bar_pos_user', JSON.stringify(user));

    // Role-based redirection
    if (user.role === Role.SUPER_ADMIN) {
      setCurrentView('SUPER_ADMIN_PORTAL');
    } else if (user.role === Role.OWNER || user.role === Role.ADMIN) {
      setCurrentView('ANALYTICS');
    } else {
      setCurrentView('POS');
    }

    if (business) {
      setBusinesses(prev => {
        const exists = prev.find(b => b.id === business.id);
        return exists ? prev : [...prev, business];
      });
    }

    if (initialState) {
      if (initialState.products && initialState.products.length > 0) setProducts(initialState.products);
      if (initialState.sales) setSales(initialState.sales);
      if (initialState.auditLogs) setAuditLogs(initialState.auditLogs);
      if (initialState.users) setAllUsers(initialState.users);
    } else if (user.role !== Role.SUPER_ADMIN) {
      setAllUsers([user]);
    }

    addLog('LOGIN', 'Session authenticated via MongoDB', user);
  };

  const handleLogout = () => {
    addLog('LOGOUT', 'Session ended');
    setCurrentUser(null);
    localStorage.removeItem('bar_pos_user');
    setCart([]);
    setSales([]);
    setAllUsers([]);
    setProducts(INITIAL_PRODUCTS);
    isInitialLoad.current = true;
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock - 1 } : p));
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        if (delta > 0) {
          const product = products.find(p => p.id === productId);
          if (product && product.stock <= 0) return item;
        }
        setProducts(p => p.map(prod => prod.id === productId ? { ...prod, stock: prod.stock - delta } : prod));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find(i => i.id === productId);
    if (item) setProducts(p => p.map(prod => prod.id === productId ? { ...prod, stock: prod.stock + item.quantity } : prod));
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const checkout = (paymentMethod: 'Cash' | 'Mpesa', customerPhone?: string) => {
    if (cart.length === 0 || !currentUser) return;
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      businessId: currentUser.businessId || 'global',
      date: new Date().toISOString(),
      items: [...cart],
      totalAmount,
      paymentMethod,
      salesPerson: currentUser.name,
      customerPhone
    };
    setSales(prev => [newSale, ...prev]);
    addLog('SALE', `Order ${newSale.id} (Ksh ${newSale.totalAmount})`);
    setCart([]);
    return newSale;
  };

  const handleAddBusiness = async (biz: Omit<Business, 'id' | 'createdAt'>, initialOwner: Omit<User, 'id' | 'businessId' | 'status'>) => {
    const newBusinessId = `bus_${Math.random().toString(36).substr(2, 5)}`;
    const newBizWithMeta: Business = { ...biz, id: newBusinessId, createdAt: new Date().toISOString() };
    const newUser: User = { ...initialOwner, id: Math.random().toString(36).substr(2, 9), businessId: newBusinessId, status: 'Active' };

    try {
      const response = await fetch(`${GLOBAL_BACKEND}/api/admin/businesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business: newBizWithMeta, owner: newUser })
      });
      if (response.ok) {
        setBusinesses(prev => [...prev, newBizWithMeta]);
        setAllUsers(prev => [...prev, newUser]);
        showToast("Business Provisioned.", "success");
      }
    } catch (err) {
      showToast("Failed to save.", "error");
    }
  };

  const updateBusiness = (updatedBiz: Business) => {
    setBusinesses(prev => prev.map(b => b.id === updatedBiz.id ? updatedBiz : b));
  };

  if (!currentUser) return <Login onLogin={handleLogin} backendUrl={GLOBAL_BACKEND} />;

  const currentBusiness = businesses.find(b => b.id === currentUser.businessId);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden flex-col md:flex-row">
      <Sidebar
        currentView={currentView}
        setView={setCurrentView}
        user={currentUser}
        onLogout={handleLogout}
        offline={!navigator.onLine}
        onSync={() => syncWithCloud()}
        isSyncing={isSyncing}
        lastSync={lastSync}
        backendAlive={backendAlive}
      />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="h-16 md:h-20 border-b bg-white flex items-center justify-between px-4 md:px-10 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight truncate">
              {currentBusiness?.name || 'Platform Hub'} • {currentView.replace('_', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-3 md:gap-6 cursor-pointer" onClick={() => setCurrentView('PROFILE')}>
            <div className="text-right hidden md:block">
              <p className="text-sm font-black text-slate-900">{currentUser.name}</p>
              <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{currentUser.role}</p>
            </div>
            <img src={currentUser.avatar} alt="Profile" className="w-9 h-9 md:w-11 md:h-11 rounded-2xl shadow-md object-cover" />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-10 no-scrollbar relative flex flex-col">
          <div className="flex-1">
            {currentView === 'POS' && <POS products={products} addToCart={addToCart} cart={cart} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} onCheckout={checkout} businessName={currentBusiness?.name || 'BarSync'} />}
            {currentView === 'INVENTORY' && <Inventory products={products} onUpdate={(p) => setProducts(prev => prev.map(item => item.id === p.id ? p : item))} onAdd={(p) => setProducts(prev => [...prev, { ...p, id: Date.now().toString() } as Product])} userRole={currentUser.role} />}
            {currentView === 'SUPER_ADMIN_PORTAL' && currentUser.role === Role.SUPER_ADMIN && <SuperAdminPortal businesses={businesses} onAdd={handleAddBusiness} onUpdate={updateBusiness} sales={sales} />}
            {currentView === 'USER_MANAGEMENT' && <UserManagement users={allUsers} onAdd={(u) => { setAllUsers(prev => [...prev, { ...u, id: Date.now().toString(), businessId: currentUser.businessId!, status: 'Active' }]); syncWithCloud(true); }} onUpdate={(u) => { setAllUsers(prev => prev.map(item => item.id === u.id ? u : item)); syncWithCloud(true); }} onDelete={(id) => { setAllUsers(prev => prev.filter(u => u.id !== id)); syncWithCloud(true); }} />}
            {currentView === 'REPORTS' && <Reports sales={sales.filter(s => s.businessId === currentUser.businessId)} businessName={currentBusiness?.name || 'BarSync'} />}
            {currentView === 'AUDIT_LOGS' && <AuditLogs logs={currentUser.role === Role.SUPER_ADMIN ? auditLogs : auditLogs.filter(l => l.businessId === currentUser.businessId)} />}
            {currentView === 'SALES' && <SalesHistory sales={sales.filter(s => s.businessId === currentUser.businessId)} />}
            {currentView === 'ANALYTICS' && <Dashboard sales={sales.filter(s => s.businessId === currentUser.businessId)} products={products} />}
            {currentView === 'PROFILE' && <Profile user={currentUser} onUpdate={(u) => { setAllUsers(prev => prev.map(item => item.id === u.id ? u : item)); setCurrentUser(u); }} />}
          </div>

          <footer className="mt-12 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest pb-10">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full border border-indigo-100 font-bold">Developed by SLIEMTECH 0757983954</span>
            </div>
            <div className="flex items-center gap-2">
              <span>© 2026 BARSYNC POS</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span className="text-slate-300">All Rights Reserved</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default App;
