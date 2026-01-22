
import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_PRODUCTS } from './constants.tsx';
import { Product, Sale, User, Role, View, CartItem, Business, AuditLog } from './types.ts';
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

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('bar_pos_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    try {
      const saved = localStorage.getItem('bar_pos_audit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [businesses, setBusinesses] = useState<Business[]>(() => {
    try {
      const saved = localStorage.getItem('bar_pos_businesses');
      return saved ? JSON.parse(saved) : [
        { 
          id: 'bus_1', 
          name: 'The Junction Bar', 
          ownerName: 'Jeniffer', 
          mongoDatabase: 'barsync_prod', 
          mongoCollection: 'junction_records', 
          mongoConnectionString: 'https://barsync-backend.onrender.com', // Example Production URL
          subscriptionStatus: 'Active', 
          createdAt: new Date().toISOString() 
        }
      ];
    } catch { return []; }
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('bar_pos_all_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((u: User) => ({
          ...u,
          password: u.password || (u.role === Role.SUPER_ADMIN ? 'admin' : '123')
        }));
      }
    } catch (e) { console.error("Cache load fail", e); }
    
    return [
      { id: '1', name: 'Jeniffer', role: Role.BARTENDER, avatar: 'https://picsum.photos/seed/jen/100/100', businessId: 'bus_1', status: 'Active', password: '123' },
      { id: '2', name: 'Winnie Admin', role: Role.ADMIN, avatar: 'https://picsum.photos/seed/win/100/100', businessId: 'bus_1', status: 'Active', password: '123' },
      { id: 'super_1', name: 'Platform Owner', role: Role.SUPER_ADMIN, avatar: 'https://picsum.photos/seed/owner/100/100', status: 'Active', password: 'admin' },
    ];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('bar_pos_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('bar_pos_sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentView, setCurrentView] = useState<View>('POS');
  const [isSyncing, setIsSyncing] = useState(false);
  const [backendAlive, setBackendAlive] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(localStorage.getItem('bar_pos_last_sync'));

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
    const currentBiz = businesses.find(b => b.id === currentUser?.businessId);
    const backendUrl = currentBiz?.mongoConnectionString || 'https://barsync-backend.onrender.com';

    if (!navigator.onLine) {
      if (!isSilent) alert("Device is offline. Data saved locally.");
      return;
    }

    if (!isSilent) setIsSyncing(true);
    
    try {
      const response = await fetch(`${backendUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBiz?.id || 'admin_node',
          businessName: currentBiz?.name || 'Platform Hub',
          data: { sales, products, auditLogs, timestamp: new Date().toISOString() }
        })
      });

      if (!response.ok) {
        throw new Error(`Cloud Rejection: ${response.status}`);
      }

      const now = new Date().toLocaleString();
      setLastSync(now);
      localStorage.setItem('bar_pos_last_sync', now);
      addLog('BACKEND_SYNC', `Cloud handshake successful for ${currentBiz?.name || 'Admin'}`);
      if (!isSilent) alert("Cloud Node Synchronized Successfully.");
    } catch (error) {
      console.error("Backend Connection Failure:", error);
      if (!isSilent) alert("Cloud Sync Failed. The backend might be starting up (Render free tier) or URL is incorrect.");
    } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, [businesses, currentUser, products, sales, auditLogs, addLog]);

  // Backend Health Check
  useEffect(() => {
    const checkBackend = async () => {
      const currentBiz = businesses.find(b => b.id === currentUser?.businessId);
      const url = currentBiz?.mongoConnectionString || 'https://barsync-backend.onrender.com';
      try {
        const res = await fetch(`${url}/health`, { method: 'GET' });
        setBackendAlive(res.ok);
      } catch {
        setBackendAlive(false);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [businesses, currentUser]);

  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const handleOnline = () => { 
      setOffline(false); 
      syncWithCloud(true); 
    };
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncWithCloud]);

  useEffect(() => {
    localStorage.setItem('bar_pos_products', JSON.stringify(products));
    localStorage.setItem('bar_pos_sales', JSON.stringify(sales));
    localStorage.setItem('bar_pos_businesses', JSON.stringify(businesses));
    localStorage.setItem('bar_pos_all_users', JSON.stringify(allUsers));
    localStorage.setItem('bar_pos_audit_logs', JSON.stringify(auditLogs));
    if (currentUser) localStorage.setItem('bar_pos_user', JSON.stringify(currentUser));
  }, [products, sales, currentUser, businesses, allUsers, auditLogs]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    addLog('LOGIN', 'Session started');
  };

  const handleLogout = () => {
    addLog('LOGOUT', 'Session ended');
    setCurrentUser(null);
    setCart([]);
  };

  const addToCart = useCallback((product: Product) => {
    if (product.stock <= 0) return;
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: p.stock - 1 } : p));
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const updateCartQuantity = useCallback((productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        // Only allow increment if stock is available
        if (delta > 0) {
          const product = products.find(p => p.id === productId);
          if (product && product.stock <= 0) return item;
        }
        setProducts(p => p.map(prod => prod.id === productId ? { ...prod, stock: prod.stock - delta } : prod));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, [products]);

  const removeFromCart = useCallback((productId: string) => {
    const item = cart.find(i => i.id === productId);
    if (item) setProducts(p => p.map(prod => prod.id === productId ? { ...prod, stock: prod.stock + item.quantity } : prod));
    setCart(prev => prev.filter(item => item.id !== productId));
  }, [cart]);

  const checkout = useCallback((paymentMethod: 'Cash' | 'Mpesa', customerPhone?: string) => {
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

    // Trigger silent cloud backup
    if (navigator.onLine && backendAlive) {
      setTimeout(() => syncWithCloud(true), 500);
    }

    return newSale;
  }, [cart, currentUser, addLog, syncWithCloud, backendAlive]);

  const handleAddBusiness = (biz: Omit<Business, 'id' | 'createdAt'>, initialUser: Omit<User, 'id' | 'businessId' | 'status'>) => {
    const newBusinessId = `bus_${Math.random().toString(36).substr(2, 5)}`;
    const newBizWithMeta: Business = { ...biz, id: newBusinessId, createdAt: new Date().toISOString() };
    setBusinesses(prev => [...prev, newBizWithMeta]);
    const newUser: User = { ...initialUser, id: Math.random().toString(36).substr(2, 9), businessId: newBusinessId, status: 'Active' };
    setAllUsers(prev => [...prev, newUser]);
  };

  const updateBusiness = (updatedBiz: Business) => {
    setBusinesses(prev => prev.map(b => b.id === updatedBiz.id ? updatedBiz : b));
  };

  if (!currentUser) return <Login onLogin={handleLogin} businesses={businesses} allUsers={allUsers} />;

  const currentBusiness = businesses.find(b => b.id === currentUser.businessId);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden flex-col md:flex-row">
      <Sidebar 
        currentView={currentView} 
        setView={setCurrentView} 
        user={currentUser} 
        onLogout={handleLogout}
        offline={offline}
        onSync={() => syncWithCloud()}
        isSyncing={isSyncing}
        lastSync={lastSync}
        backendAlive={backendAlive}
      />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {offline && (
          <div className="bg-amber-500 text-white px-4 py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] animate-pulse shrink-0 z-50">
            Local Mode • Database Sync Paused
          </div>
        )}
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

        <div className="flex-1 overflow-auto p-4 md:p-10 no-scrollbar relative">
          {isSyncing && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl text-center space-y-6 animate-pulse">
                <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h3 className="text-xl font-black uppercase tracking-tight">Pushing to Cloud Node</h3>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">Hosted Driver Active</p>
              </div>
            </div>
          )}

          {currentView === 'POS' && <POS products={products} addToCart={addToCart} cart={cart} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} onCheckout={checkout} businessName={currentBusiness?.name || 'BarSync'} />}
          {currentView === 'INVENTORY' && <Inventory products={products} onUpdate={(p) => { setProducts(prev => prev.map(item => item.id === p.id ? p : item)); addLog('STOCK_UPDATE', p.name); }} onAdd={(p) => { setProducts(prev => [...prev, { ...p, id: Date.now().toString() } as Product]); }} userRole={currentUser.role} />}
          {currentView === 'SUPER_ADMIN_PORTAL' && currentUser.role === Role.SUPER_ADMIN && <SuperAdminPortal businesses={businesses} onAdd={handleAddBusiness} onUpdate={updateBusiness} sales={sales} />}
          {currentView === 'USER_MANAGEMENT' && <UserManagement users={allUsers.filter(u => u.businessId === currentUser.businessId)} onAdd={(u) => setAllUsers(prev => [...prev, { ...u, id: Date.now().toString(), businessId: currentUser.businessId!, status: 'Active' }])} onUpdate={(u) => setAllUsers(prev => prev.map(item => item.id === u.id ? u : item))} onDelete={(id) => setAllUsers(prev => prev.filter(u => u.id !== id))} />}
          {currentView === 'REPORTS' && <Reports sales={sales.filter(s => s.businessId === currentUser.businessId)} businessName={currentBusiness?.name || 'BarSync'} />}
          {currentView === 'AUDIT_LOGS' && <AuditLogs logs={currentUser.role === Role.SUPER_ADMIN ? auditLogs : auditLogs.filter(l => l.businessId === currentUser.businessId)} />}
          {currentView === 'SALES' && <SalesHistory sales={sales.filter(s => s.businessId === currentUser.businessId)} />}
          {currentView === 'ANALYTICS' && <Dashboard sales={sales.filter(s => s.businessId === currentUser.businessId)} products={products} />}
          {currentView === 'PROFILE' && <Profile user={currentUser} onUpdate={(u) => { setAllUsers(prev => prev.map(item => item.id === u.id ? u : item)); setCurrentUser(u); }} />}
        </div>
      </main>
    </div>
  );
};

export default App;
