import React, { useEffect, useState } from 'react';
import { View, Product, Sale, CartItem, User, Role, AuditLog, Business } from './types';
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

const now = () => new Date().toISOString();

/* -------------------- MAIN APP CONTENT -------------------- */
const AppContent: React.FC = () => {
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('POS');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [business, setBusiness] = useState<any>({
    id: 'loading',
    name: 'Loading...',
    ownerName: 'Admin',
    mongoDatabase: '',
    mongoCollection: '',
    subscriptionStatus: 'Trial',
    subscriptionPlan: 'Basic',
    paymentStatus: 'Pending',
    createdAt: now(),
    updatedAt: now()
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  /* -------------------- API SYNC -------------------- */
  const fetchState = async (bizId: string) => {
    setIsSyncing(true);
    try {
      const [pRes, sRes, uRes, lRes] = await Promise.all([
        fetch(`/api/products?businessId=${bizId}`),
        fetch(`/api/sales?businessId=${bizId}`),
        fetch(`/api/users/admin/businesses`), // Simplified for now
        fetch(`/api/auditLogs?businessId=${bizId}`)
      ]);

      if (pRes.ok) setProducts(await pRes.json());
      if (sRes.ok) setSales((await sRes.json()).reverse());
      if (lRes.ok) setAuditLogs((await lRes.json()).reverse());
    } catch (err) {
      console.error("Sync Error:", err);
      addToast("Failed to fetch latest data from cloud", "error");
    } finally {
      setIsSyncing(false);
    }
  };

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
  const onCheckout = async (method: 'Cash' | 'Mpesa', customerPhone?: string): Promise<Sale | undefined> => {
    if (cart.length === 0 || !currentUser) return undefined;

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      businessId: currentUser.businessId,
      date: now(),
      items: cart,
      totalAmount,
      paymentMethod: method,
      salesPerson: currentUser.name,
      customerPhone,
    };

    // Update Local State for UI responsiveness
    setSales(prev => [newSale, ...prev]);
    const updatedProducts = products.map(p => {
      const item = cart.find(i => i.id === p.id);
      if (!item) return p;
      return { ...p, stock: Math.max(0, p.stock - item.quantity), updatedAt: now() };
    });
    setProducts(updatedProducts);
    setCart([]);

    // Push to Cloud
    try {
      await Promise.all([
        fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, sale: newSale })
        }),
        fetch('/api/products/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, products: updatedProducts })
        })
      ]);
      addToast("Sale recorded on cloud", "success");
    } catch (err) {
      addToast("Cloud sync failed. Data may be inconsistent.", "error");
    }

    return newSale;
  };

  const handleProductUpdate = async (updated: Product) => {
    const productWithTimestamp = { ...updated, updatedAt: now() };
    const newProducts = products.map(p => p.id === updated.id ? productWithTimestamp : p);
    setProducts(newProducts);

    try {
      await fetch('/api/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentUser?.businessId, products: newProducts })
      });
      addToast("Inventory updated on cloud", "success");
    } catch (err) {
      addToast("Cloud inventory update failed", "error");
    }
  };

  const handleProductAdd = async (newProductData: Omit<Product, 'id' | 'openingStock' | 'additions' | 'createdAt' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...newProductData,
      id: Math.random().toString(36).substr(2, 9),
      openingStock: newProductData.stock,
      additions: 0,
      createdAt: now(),
      updatedAt: now(),
    };
    const newProducts = [...products, newProduct];
    setProducts(newProducts);

    try {
      await fetch('/api/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentUser?.businessId, products: newProducts })
      });
      addToast("New product added to cloud", "success");
    } catch (err) {
      addToast("Cloud addition failed", "error");
    }
  };

  if (!currentUser) {
    return (
      <Login
        onLogin={(user, biz) => {
          setCurrentUser(user);
          if (biz) setBusiness(biz);
          fetchState(user.businessId || 'admin_node');
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
          offline={false}
          onSync={() => fetchState(currentUser.businessId || 'admin_node')}
          isSyncing={isSyncing}
          lastSync={now()}
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
                  businessName={business?.name || 'BarSync'}
                  onReorder={() => { }}
                />
              )}

              {view === 'ANALYTICS' && (
                <Dashboard sales={sales} products={products} />
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
                  onAdd={async (newUser) => {
                    const exists = users.some(u => u.name.toLowerCase() === newUser.name.toLowerCase());
                    if (exists) {
                      addToast("User with this name already exists!", "error");
                      return;
                    }
                    const userWithId: User = { ...newUser, id: Math.random().toString(36).substr(2, 9), businessId: business.id || 'local_biz', status: 'Active', updatedAt: now() };
                    const newUsers = [...users, userWithId];
                    setUsers(newUsers);
                  }}
                  onUpdate={(updatedUser) => {
                    const newUsers = users.map(u => u.id === updatedUser.id ? { ...updatedUser, updatedAt: now() } : u);
                    setUsers(newUsers);
                  }}
                  onDelete={(id) => {
                    const newUsers = users.filter(u => u.id !== id);
                    setUsers(newUsers);
                  }}
                />
              )}

              {view === 'REPORTS' && (
                <Reports sales={sales} businessName={business?.name || 'BarSync'} />
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
                <SuperAdminPortal
                  businesses={businesses}
                  sales={sales}
                  onAdd={(newBiz, initialUser) => {
                    const bizId = Math.random().toString(36).substr(2, 9);
                    const createdBiz: Business = { ...newBiz, id: bizId, createdAt: now(), updatedAt: now(), paymentStatus: 'Pending', subscriptionPlan: 'Basic' };
                    setBusinesses(prev => [...prev, createdBiz]);

                    const createdUser: User = { ...initialUser, id: Math.random().toString(36).substr(2, 9), businessId: bizId, status: 'Active', updatedAt: now() };
                    setUsers(prev => [...prev, createdUser]);
                  }}
                  onUpdate={(updatedBiz) => {
                    setBusinesses(prev => prev.map(b => b.id === updatedBiz.id ? { ...updatedBiz, updatedAt: now() } : b));
                  }}
                />
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
