import React, { useEffect, useState } from 'react';
import { Product, Sale, User, View } from './types';
import { PRODUCT_TEMPLATES } from './constants';

/* -------------------- STORAGE KEYS -------------------- */
const STORAGE_KEYS = {
  PRODUCTS: 'pos_products_v1',
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

/* -------------------- PRODUCT INIT -------------------- */
/**
 * SAFE RULES:
 * - Templates are used ONLY when storage is empty
 * - Prices & stock are NEVER re-applied after first save
 */
function initializeProducts(): Product[] {
  const stored = loadFromStorage<Product[]>(STORAGE_KEYS.PRODUCTS, []);

  if (stored.length > 0) {
    return stored;
  }

  const fresh: Product[] = PRODUCT_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    price: t.defaultPrice,     // applied ONCE
    stock: 0,
    openingStock: 0,
    additions: 0,
    imageUrl: t.imageUrl,
    updatedAt: now(),
  }));

  saveToStorage(STORAGE_KEYS.PRODUCTS, fresh);
  return fresh;
}

/* -------------------- APP -------------------- */
const App: React.FC = () => {
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

  /* -------------------- PERSISTENCE -------------------- */
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VIEW, view);
  }, [view]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
  }, [products]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SALES, sales);
  }, [sales]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.USERS, users);
  }, [users]);

  /* -------------------- MUTATIONS -------------------- */

  const updateProduct = (updated: Product) => {
    setProducts(prev =>
      prev.map(p =>
        p.id === updated.id
          ? { ...updated, updatedAt: now() }
          : p
      )
    );
  };

  const addSale = (sale: Sale) => {
    setSales(prev => [...prev, sale]);

    setProducts(prev =>
      prev.map(p => {
        const item = sale.items.find(i => i.id === p.id);
        if (!item) return p;

        return {
          ...p,
          stock: Math.max(0, p.stock - item.quantity),
          updatedAt: now(),
        };
      })
    );
  };

  /* -------------------- RENDER -------------------- */
  return (
    <div style={{ padding: 20 }}>
      <h1>POS System</h1>

      <p><b>View:</b> {view}</p>

      <button onClick={() => setView('POS')}>POS</button>
      <button onClick={() => setView('INVENTORY')}>Inventory</button>
      <button onClick={() => setView('SALES')}>Sales</button>

      <hr />

      <pre style={{ maxHeight: 300, overflow: 'auto' }}>
        {JSON.stringify(products, null, 2)}
      </pre>
    </div>
  );
};

export default App;
