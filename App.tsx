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
  const { showToast: addToast } = useToast();
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /* -------------------- API SYNC -------------------- */
  const fetchState = async (bizId: string) => {
    setIsSyncing(true);
    try {
      const [pRes, sRes, uRes, lRes] = await Promise.all([
        fetch(`/api/products?businessId=${bizId}`),
        fetch(`/api/sales?businessId=${bizId}`),
        fetch(`/api/users?businessId=${bizId}`),
        fetch(`/api/auditLogs?businessId=${bizId}`)
      ]);

      if (pRes.ok) setProducts(await pRes.json());
      if (sRes.ok) setSales((await sRes.json()).reverse());
      if (uRes.ok) setUsers(await uRes.json());
      if (lRes.ok) setAuditLogs((await lRes.json()).reverse());

      // If Super Admin, fetch all businesses for the portal
      if (currentUser?.role === Role.SUPER_ADMIN) {
        const bRes = await fetch(`/api/users/admin/businesses`);
        if (bRes.ok) setBusinesses(await bRes.json());

        const allUsersRes = await fetch(`/api/auth/admin/users`);
        if (allUsersRes.ok) setUsers(await allUsersRes.json());
      }
    } catch (err) {
      console.error("Sync Error:", err);
      addToast("Failed to sync with cloud", "error");
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
  const onCheckout = async (method: 'Cash' | 'Mpesa' | 'Card', customerPhone?: string): Promise<Sale | undefined> => {
    if (cart.length === 0 || !currentUser) return undefined;

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const formatDateId = () => {
      const d = new Date();
      const yy = d.getFullYear().toString().slice(-2);
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      const dd = d.getDate().toString().padStart(2, '0');
      const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
      return `${yy}${mm}${dd}-${rand}`;
    };

    const newSale: Sale = {
      id: formatDateId(),
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

  // Background Sync Agent
  useEffect(() => {
    if (!currentUser) return;

    const syncInterval = setInterval(async () => {
      console.log('🔄 Background Sync Agent Active...');
      try {
        const bid = currentUser.businessId || business.id || 'admin_node';
        if (bid !== 'local_biz') {
          const res = await fetch(`/api/sales?businessId=${bid}`);
          if (res.ok) {
            const cloudSales = await res.json();
            setSales(cloudSales);
          }

          const prodRes = await fetch(`/api/products?businessId=${bid}`);
          if (prodRes.ok) {
            const cloudProducts = await prodRes.json();
            setProducts(cloudProducts);
          }
        }

        if (currentUser.role === Role.SUPER_ADMIN) {
          const usersRes = await fetch(`/api/auth/admin/users`);
          if (usersRes.ok) {
            const cloudUsers = await usersRes.json();
            setUsers(cloudUsers);
          }
          const bizRes = await fetch(`/api/auth/admin/businesses`);
          if (bizRes.ok) {
            setBusinesses(await bizRes.json());
          }
        } else {
          const usersRes = await fetch(`/api/users?businessId=${bid}`);
          if (usersRes.ok) {
            setUsers(await usersRes.json());
          }
        }
      } catch (err) {
        console.error('Sync Agent Error:', err);
      }
    }, 15000); // Sync every 15 seconds

    return () => clearInterval(syncInterval);
  }, [currentUser, business.id]);

  const onLogout = () => {
    setCurrentUser(null);
    setCart([]);
    setView('LOGIN');
    addToast("Logged out successfully", "success");
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const res = await fetch(`/api/auth/admin/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
        if (currentUser?.id === updatedUser.id) {
          setCurrentUser(updatedUser);
        }
        addToast("User updated successfully", "success");
      } else {
        throw new Error("Update failed");
      }
    } catch (err) {
      addToast("Update failed", "error");
      throw err;
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure? This action is permanent.")) return;
    try {
      const res = await fetch(`/api/auth/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        addToast("User removed", "success");
      }
    } catch (err) {
      addToast("Delete failed", "error");
    }
  };

  const handleUpdateBusiness = async (updatedBiz: Business) => {
    try {
      const res = await fetch(`/api/auth/admin/businesses/${updatedBiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBiz)
      });
      if (res.ok) {
        setBusinesses(businesses.map(b => b.id === updatedBiz.id ? updatedBiz : b));
        setBusiness(updatedBiz); // Critical: Update active business local state
        addToast("Business configuration synced", "success");
      } else {
        throw new Error("Sync failed");
      }
    } catch (err) {
      addToast("Update failed", "error");
      throw err;
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    if (!confirm("CRITICAL: This will delete ALL data for this business and ALL associated staff accounts. Proceed?")) return;
    try {
      const res = await fetch(`/api/auth/admin/businesses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBusinesses(businesses.filter(b => b.id !== id));
        addToast("Establishment and staff removed permanently", "success");
      }
    } catch (err) {
      addToast("Delete failed", "error");
    }
  };

  if (!currentUser) {
    return (
      <Login
        onLogin={(user, biz) => {
          setCurrentUser(user);
          if (biz) setBusiness(biz);
          if (user.role === Role.SUPER_ADMIN) {
            setView('SUPER_ADMIN_PORTAL');
          } else {
            setView('POS');
          }
          setMobileSidebarOpen(false);
          fetchState(user.businessId || 'admin_node');
        }}
        backendUrl=""
      />
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
      {/* Mobile Hamburger Trigger */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="lg:hidden fixed top-6 left-6 z-40 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-600 active:scale-95 border border-slate-100"
      >
        <i className="fa-solid fa-bars-staggered text-xl"></i>
      </button>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentView={view}
          setView={(v) => { setView(v); setMobileSidebarOpen(false); }}
          user={currentUser}
          business={business}
          onLogout={onLogout}
          offline={false}
          onSync={() => fetchState(currentUser.businessId || 'admin_node')}
          isSyncing={isSyncing}
          lastSync={now()}
          backendAlive={true}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
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

                    try {
                      const res = await fetch(`/api/auth/admin/users`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userWithId)
                      });
                      if (res.ok) {
                        setUsers([...users, userWithId]);
                        addToast("Staff created successfully", "success");
                      }
                    } catch (err) {
                      addToast("Failed to create staff", "error");
                    }
                  }}
                  onUpdate={handleUpdateUser}
                  onDelete={handleDeleteUser}
                />
              )}

              {view === 'REPORTS' && <Reports sales={sales} businessName={business.name} logo={business.logo} />}
              {view === 'PROFILE' && currentUser && (
                <Profile
                  user={currentUser}
                  onUpdate={handleUpdateUser}
                  business={business}
                  onUpdateBusiness={handleUpdateBusiness}
                />
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
                  allUsers={users}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  onAdd={async (newBiz, initialUser) => {
                    const bizId = Math.random().toString(36).substr(2, 9);
                    const createdBiz: Business = { ...newBiz, id: bizId, createdAt: now(), updatedAt: now(), paymentStatus: 'Pending', subscriptionPlan: 'Basic' };
                    const createdUser: User = { ...initialUser, id: Math.random().toString(36).substr(2, 9), businessId: bizId, status: 'Active', updatedAt: now() };

                    try {
                      const res = await fetch(`/api/auth/admin/businesses`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ business: createdBiz, owner: createdUser })
                      });
                      if (res.ok) {
                        setBusinesses(prev => [...prev, createdBiz]);
                        // Only add to users list OR refetch
                        addToast("Business & Owner provisioned on cloud", "success");
                        // Trigger a refetch of all users to stay in sync
                        const usersRes = await fetch(`/api/auth/admin/users`);
                        if (usersRes.ok) setUsers(await usersRes.json());
                      }
                    } catch (err) {
                      addToast("Provisioning failed", "error");
                    }
                  }}
                  onUpdate={handleUpdateBusiness}
                  onDelete={handleDeleteBusiness}
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
