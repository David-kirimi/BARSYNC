import React, { useEffect, useState, useMemo } from 'react';
import { View, Product, Sale, CartItem, User, Role, AuditLog, Business, Tab } from './types';
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
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showVerificationOverlay, setShowVerificationOverlay] = useState(true);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  // Trial Timer logic moved from Dashboard to App (Global)
  useEffect(() => {
    if (business?.subscriptionStatus !== 'Trial' && business?.subscriptionStatus !== 'Pending Approval') {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const trialDuration = 3 * 24 * 60 * 60 * 1000;
      const startTimeStr = business?.trialStartedAt || business?.createdAt;
      if (!startTimeStr) return;

      const startTime = new Date(startTimeStr).getTime();
      const expiry = startTime + trialDuration;
      const nowTs = new Date().getTime();
      const difference = expiry - nowTs;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();
    return () => clearInterval(timer);
  }, [business?.subscriptionStatus, business?.trialStartedAt, business?.createdAt]);

  // CRITICAL: 3-Day Lockout Logic
  const isAccountLocked = useMemo(() => {
    if (currentUser?.role === Role.SUPER_ADMIN) return false;
    if (business?.subscriptionStatus === 'Active') return false;
    
    // Check if Trial has expired
    const trialDuration = 3 * 24 * 60 * 60 * 1000; // 3 days
    const startTimeStr = business?.trialStartedAt || business?.createdAt;
    if (!startTimeStr) return false;

    const startTime = new Date(startTimeStr).getTime();
    const expiry = startTime + trialDuration;
    const nowTs = new Date().getTime();
    
    return nowTs > expiry;
  }, [business, currentUser]);

  /* -------------------- API SYNC -------------------- */
  const fetchState = async (bizId: string) => {
    setIsSyncing(true);
    try {
      const [pRes, sRes, uRes, lRes, tRes] = await Promise.all([
        fetch(`/api/products?businessId=${bizId}`),
        fetch(`/api/sales?businessId=${bizId}`),
        fetch(`/api/users?businessId=${bizId}`),
        fetch(`/api/auditLogs?businessId=${bizId}`),
        fetch(`/api/tabs?businessId=${bizId}`)
      ]);

      if (pRes.ok) setProducts(await pRes.json());
      if (sRes.ok) setSales((await sRes.json()).reverse());
      if (uRes.ok) setUsers(await uRes.json());
      if (lRes.ok) setAuditLogs((await lRes.json()).reverse());
      if (tRes.ok) setTabs(await tRes.json());

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

  const onOpenTab = async (customerName: string): Promise<Tab | undefined> => {
    if (!currentUser || !customerName.trim()) return;
    const newTab: Tab = {
      id: `tab_${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      businessId: currentUser.businessId,
      customerName: customerName.trim(),
      items: [],
      totalAmount: 0,
      servedBy: currentUser.name,
      status: 'OPEN',
      createdAt: now()
    };
    const updatedTabs = [...tabs, newTab];
    setTabs(updatedTabs);
    try {
      await fetch('/api/tabs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentUser.businessId, tabs: updatedTabs })
      });
      addToast(`Tab opened for ${customerName}`, "success");
    } catch (err) { addToast("Cloud sync failed", "error"); }
    return newTab;
  };

  const onAddToTab = async (tabId: string, item: Product) => {
    if (!currentUser) return;
    const updatedTabs = tabs.map(t => {
      if (t.id !== tabId) return t;
      const items = [...t.items];
      const existing = items.find(i => i.id === item.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        items.push({ ...item, quantity: 1 });
      }
      return { ...t, items, totalAmount: items.reduce((sum, i) => sum + (i.price * i.quantity), 0) };
    });
    setTabs(updatedTabs);

    const updatedProducts = products.map(p => p.id === item.id ? { ...p, stock: Math.max(0, p.stock - 1), updatedAt: now() } : p);
    setProducts(updatedProducts);

    try {
      await Promise.all([
        fetch('/api/tabs/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, tabs: updatedTabs })
        }),
        fetch('/api/products/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, products: updatedProducts })
        })
      ]);
    } catch (err) { addToast("Cloud update failed", "error"); }
  };

  const onAddCartToTab = async (tabId: string, items: CartItem[]) => {
    if (!currentUser || items.length === 0) return;

    const updatedTabs = tabs.map(t => {
      if (t.id !== tabId) return t;
      const newItems = [...t.items];
      items.forEach(newItem => {
        const existing = newItems.find(i => i.id === newItem.id);
        if (existing) {
          existing.quantity += newItem.quantity;
        } else {
          newItems.push({ ...newItem });
        }
      });
      return { ...t, items: newItems, totalAmount: newItems.reduce((sum, i) => sum + (i.price * i.quantity), 0) };
    });
    setTabs(updatedTabs);

    const updatedProducts = products.map(p => {
      const cartItem = items.find(i => i.id === p.id);
      if (!cartItem) return p;
      return { ...p, stock: Math.max(0, p.stock - cartItem.quantity), updatedAt: now() };
    });
    setProducts(updatedProducts);

    try {
      await Promise.all([
        fetch('/api/tabs/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, tabs: updatedTabs })
        }),
        fetch('/api/products/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, products: updatedProducts })
        })
      ]);
      addToast(`Items added to tab`, "success");
    } catch (err) { addToast("Cloud update failed", "error"); }
  };

  const onUpdateTabQuantity = async (tabId: string, productId: string, delta: number) => {
    if (!currentUser) return;
    let stockDiff = 0;
    const updatedTabs = tabs.map(t => {
      if (t.id !== tabId) return t;
      const items = t.items.map(i => {
        if (i.id !== productId) return i;
        const oldQty = i.quantity;
        const newQty = Math.max(0, i.quantity + delta);
        stockDiff = newQty - oldQty;
        return { ...i, quantity: newQty };
      }).filter(i => i.quantity > 0);
      return { ...t, items, totalAmount: items.reduce((sum, i) => sum + (i.price * i.quantity), 0) };
    });

    setTabs(updatedTabs);
    const updatedProducts = products.map(p => p.id === productId ? { ...p, stock: Math.max(0, p.stock - stockDiff), updatedAt: now() } : p);
    setProducts(updatedProducts);

    try {
      await Promise.all([
        fetch('/api/tabs/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, tabs: updatedTabs })
        }),
        fetch('/api/products/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, products: updatedProducts })
        })
      ]);
    } catch (err) { addToast("Cloud update failed", "error"); }
  };

  const onSettleTab = async (tabId: string, method: 'Cash' | 'Mpesa' | 'Card'): Promise<Sale | undefined> => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !currentUser) return;

    const sale: Sale = {
      id: `${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      businessId: currentUser.businessId,
      date: now(),
      items: tab.items,
      totalAmount: tab.totalAmount,
      paymentMethod: method,
      salesPerson: tab.servedBy,
    };

    const updatedTabs = tabs.filter(t => t.id !== tabId);
    setTabs(updatedTabs);
    setSales(prev => [sale, ...prev]);

    try {
      await Promise.all([
        fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, sale })
        }),
        fetch('/api/tabs/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, tabs: updatedTabs })
        })
      ]);
      addToast("Tab settled successfully", "success");
    } catch (err) { addToast("Cloud sync failed during settlement", "error"); }
    return sale;
  };

  const onCancelTab = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !currentUser) return;

    const updatedProducts = products.map(p => {
      const tabItem = tab.items.find(ti => ti.id === p.id);
      if (!tabItem) return p;
      return { ...p, stock: p.stock + tabItem.quantity, updatedAt: now() };
    });
    const updatedTabs = tabs.filter(t => t.id !== tabId);

    setProducts(updatedProducts);
    setTabs(updatedTabs);

    try {
      await Promise.all([
        fetch('/api/tabs/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, tabs: updatedTabs })
        }),
        fetch('/api/products/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId: currentUser.businessId, products: updatedProducts })
        })
      ]);
      addToast("Tab cancelled and stock restored", "warning");
    } catch (err) { addToast("Cloud sync failed", "error"); }
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

  const handleResetStock = async () => {
    if (!confirm("This will set Current Stock as the 'Opening Stock' for all items. Proceed?")) return;

    const newProducts = products.map(p => ({
      ...p,
      openingStock: p.stock,
      updatedAt: now()
    }));

    setProducts(newProducts);
    try {
      await fetch('/api/products/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: currentUser?.businessId, products: newProducts })
      });
      addToast("Stock snapshot saved successfully", "success");
    } catch (err) {
      addToast("Failed to save snapshot", "error");
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

          const tabsRes = await fetch(`/api/tabs?businessId=${bid}`);
          if (tabsRes.ok) {
            setTabs(await tabsRes.json());
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
    // Handle Subscription Logic Transitions
    const oldBiz = businesses.find(b => b.id === updatedBiz.id) || business;
    let bizToUpdate = { ...updatedBiz };

    if (oldBiz.subscriptionStatus !== updatedBiz.subscriptionStatus) {
      if (updatedBiz.subscriptionStatus === 'Trial') {
        bizToUpdate.trialStartedAt = now();
        bizToUpdate.expiryDate = undefined;
        bizToUpdate.nextBillingDate = undefined;
      } else if (updatedBiz.subscriptionStatus === 'Active') {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30); // 30 days default
        const expiryIso = expiry.toISOString();
        bizToUpdate.expiryDate = expiryIso;
        bizToUpdate.nextBillingDate = expiryIso;
        bizToUpdate.paymentStatus = 'Verified';

        // Mark pending invoices as Paid
        if (bizToUpdate.invoices) {
          bizToUpdate.invoices = bizToUpdate.invoices.map(inv =>
            inv.status === 'Pending' ? { ...inv, status: 'Paid', expiryDate: expiryIso } : inv
          );
        }
      }
    }

    try {
      const res = await fetch(`/api/auth/admin/businesses/${bizToUpdate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bizToUpdate)
      });
      if (res.ok) {
        setBusinesses(businesses.map(b => b.id === bizToUpdate.id ? bizToUpdate : b));
        setBusiness(bizToUpdate);
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

  const handleUpdateVerification = async (note: string) => {
    try {
      const updatedBiz = { ...business, verificationNote: note, updatedAt: now() };
      await handleUpdateBusiness(updatedBiz);
      addToast("Verification details submitted for review", "success");
    } catch (err) {
      addToast("Submission failed", "error");
    }
  };

  if (!currentUser) {
    return (
      <Login
        onLogin={(user, biz) => {
          setCurrentUser(user);
          if (biz) setBusiness(biz);
          setShowVerificationOverlay(true);
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
      {/* Verification / Trial Overlay */}
      {currentUser?.role !== Role.SUPER_ADMIN && business?.id !== 'loading' && business?.subscriptionStatus !== 'Active' && showVerificationOverlay && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-8 shadow-xl shadow-amber-100/50">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            
            {!isAccountLocked ? (
              <>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-4">Welcome to BarSync</h2>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                  Open the app with <span className="text-indigo-600 font-black">3 DAYS UNLIMITED ACCESS</span>.
                  To pay, visit the <span className="text-slate-900 font-black">SUBSCRIPTION</span> tab for bank details or contact support.
                </p>
                <button
                  onClick={() => setShowVerificationOverlay(false)}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100"
                >
                  Enter Terminal (Full Access)
                </button>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-4">Trial Has Expired</h2>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                  Your 3-day trial period has <span className="text-rose-600 font-black">EXPIRED</span>.
                  Please complete your subscription payment to restore full access to your business node.
                </p>
                <button
                  onClick={() => {
                    setView('SUBSCRIPTION');
                  }}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
                >
                  Go to Subscription Hub
                </button>
              </>
            )}
            
            <p className="mt-6 text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Typical verification time: 5-15 Minutes</p>
          </div>
        </div>
      )}

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
          {currentUser?.role !== Role.SUPER_ADMIN && (business?.subscriptionStatus === 'Trial' || business?.subscriptionStatus === 'Pending Approval') && timeLeft && !isAccountLocked && (
            <div className="bg-indigo-600 text-white px-4 lg:px-6 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 shadow-lg z-30 animate-in slide-in-from-top duration-300 shrink-0">
              <div className="flex items-center gap-2 lg:gap-3">
                <i className="fa-solid fa-clock-rotate-left text-indigo-200 animate-pulse text-[10px] lg:text-xs"></i>
                <p className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-center sm:text-left leading-tight">
                  Trial Active: <span className="text-white">{timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</span> remaining
                </p>
              </div>
              <button 
                onClick={() => setView('SUBSCRIPTION')}
                className="bg-white text-indigo-600 px-3 lg:px-4 py-1 rounded-full text-[8px] lg:text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 active:scale-95 transition-all shadow-md shrink-0 w-full sm:w-auto"
              >
                Top Up / Pay
              </button>
            </div>
          )}

          <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 scroll-smooth ${isAccountLocked ? 'grayscale opacity-80' : ''}`} id="main-scroll">
            <div className="max-w-[1600px] mx-auto h-full">
              {(view === 'POS' || view === 'TABS') && (
                <POS
                  products={products}
                  addToCart={addToCart}
                  cart={cart}
                  updateCartQuantity={updateCartQuantity}
                  removeFromCart={removeFromCart}
                  onCheckout={onCheckout}
                  businessName={business?.name || 'BarSync'}
                  onReorder={() => { }}
                  tabs={tabs}
                  onOpenTab={onOpenTab}
                  onAddToTab={onAddToTab}
                  onSettleTab={onSettleTab}
                  onCancelTab={onCancelTab}
                  onUpdateTabQuantity={onUpdateTabQuantity}
                  onAddCartToTab={onAddCartToTab}
                  activeView={view}
                  isUnverified={isAccountLocked}
                />
              )}

              {view === 'ANALYTICS' && (
                <Dashboard sales={sales} products={products} business={business} />
              )}

              {view === 'INVENTORY' && (
                <Inventory
                  products={products}
                  onUpdate={handleProductUpdate}
                  onAdd={handleProductAdd}
                  onResetStock={handleResetStock}
                  userRole={currentUser.role}
                  isUnverified={isAccountLocked}
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

              {view === 'REPORTS' && (
                <Reports
                  sales={sales}
                  products={products}
                  currentUser={currentUser}
                  businessName={business.name}
                  logo={business.logo}
                />
              )}
              {(view === 'PROFILE' || view === 'SETTINGS') && currentUser && (
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
                    const planInfo = {
                      'Basic': 1500,
                      'Pro': 3500,
                      'Enterprise': 7000
                    };
                    const amount = planInfo[business.subscriptionPlan as 'Basic' | 'Pro' | 'Enterprise'] || 1500;
                    
                    const newInvoice: any = {
                      id: `INV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                      businessId: business.id,
                      date: now(),
                      amount: amount,
                      plan: business.subscriptionPlan || 'Basic',
                      status: 'Pending',
                      expiryDate: now(), // Placeholder
                      note: note, // ✅ ARCHIVE THE MESSAGE
                    };

                    const updatedInvList = [...(business.invoices || []), newInvoice];

                    const updatedBiz = {
                      ...business,
                      subscriptionStatus: status,
                      verificationNote: note,
                      invoices: updatedInvList,
                      updatedAt: now()
                    };

                    setBusiness(updatedBiz);
                    handleUpdateBusiness(updatedBiz);
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
