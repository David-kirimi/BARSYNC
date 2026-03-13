export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  BARTENDER = 'BARTENDER',
  OWNER = 'OWNER',
  WAITER = 'WAITER',
  CASHIER = 'CASHIER',
  SUPERVISOR = 'SUPERVISOR'
}

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  mongoDatabase: string;
  mongoCollection: string;
  mongoConnectionString?: string;

  subscriptionStatus: 'Active' | 'Trial' | 'Expired' | 'Pending Approval';
  subscriptionPlan: 'Basic' | 'Pro' | 'Enterprise';
  paymentStatus: 'Pending' | 'Verified' | 'Overdue';
  verificationNote?: string;

  trialStartedAt?: string;    // ✅ ADD
  expiryDate?: string;        // ✅ ADD
  nextBillingDate?: string;   // ✅ ADD
  invoices?: Invoice[];       // ✅ ADD

  createdAt: string;
  updatedAt: string;          // ✅ ADD
  logo?: string;
}

export interface Invoice {
  id: string;
  businessId: string;
  date: string;
  amount: number;
  plan: 'Basic' | 'Pro' | 'Enterprise';
  status: 'Paid' | 'Pending';
  expiryDate: string;
  reference?: string;
  note?: string;              // ✅ ADD
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  businessId?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  password?: string;

  updatedAt: string;          // ✅ ADD
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  buyingPrice?: number;

  stock: number;
  openingStock: number;
  additions: number;
  
  barcode?: string;
  productCode?: string;

  imageUrl?: string;

  createdAt: string;
  updatedAt: string;
}

export interface StockSnapshot {
  productId: string;
  productName: string;
  quantity: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  businessId: string;
  date: string;
  items: CartItem[];
  totalAmount: number;
  paymentMethod: 'Cash' | 'Mpesa' | 'Card' | 'Pending'; // 'Pending' for waiter orders
  salesPerson: string;
  customerPhone?: string;
  mpesaCode?: string;
  shiftId?: string;

  // New fields for role-based workflow
  status?: 'PENDING_PAYMENT' | 'COMPLETED';
  createdBy?: string; // Waiter ID/Name
  verifiedBy?: string; // Cashier ID/Name
  completedAt?: string;

  // ❌ NO updatedAt ON PURPOSE
  // Sales are append-only
}

export interface Tab {
  id: string;
  businessId: string;
  customerName: string;
  items: CartItem[];
  totalAmount: number;
  servedBy: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  closedAt?: string;
  shiftId?: string;
}

export interface Shift {
  id: string;
  businessId: string;
  startTime: string;
  endTime?: string;
  openedBy: string;
  closedBy?: string;
  transactionsCount: number;
  cashTotal: number;
  mpesaTotal: number;
  cardTotal: number;
  totalSales: number;
  openingStockSnapshot: StockSnapshot[];
  closingStockSnapshot?: StockSnapshot[];
  openTabsTransferred: { name: string; amount: number }[];
  status: 'OPEN' | 'CLOSED';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  businessId?: string;
}

export interface StaffLog {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  role: Role;
  signInTime: string;
  signOutTime?: string;
}

export type View =
  | 'POS'
  | 'INVENTORY'
  | 'TABS'
  | 'SALES'
  | 'ANALYTICS'
  | 'SETTINGS'
  | 'SUPER_ADMIN_PORTAL'
  | 'USER_MANAGEMENT'
  | 'REPORTS'
  | 'PROFILE'
  | 'AUDIT_LOGS'
  | 'SUBSCRIPTION'
  | 'SHIFT_HISTORY'
  | 'COUNTER_DASHBOARD'
  | 'SUPERVISOR_PORTAL';
