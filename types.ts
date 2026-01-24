export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  BARTENDER = 'BARTENDER',
  OWNER = 'OWNER'
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

  createdAt: string;
  updatedAt: string;          // ✅ ADD
  logo?: string;
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

  imageUrl?: string;

  createdAt: string;
  updatedAt: string;          // ✅ ADD (CRITICAL)
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
  paymentMethod: 'Cash' | 'Mpesa';
  salesPerson: string;
  customerPhone?: string;

  // ❌ NO updatedAt ON PURPOSE
  // Sales are append-only
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

export type View =
  | 'POS'
  | 'INVENTORY'
  | 'SALES'
  | 'ANALYTICS'
  | 'SETTINGS'
  | 'SUPER_ADMIN_PORTAL'
  | 'USER_MANAGEMENT'
  | 'REPORTS'
  | 'PROFILE'
  | 'AUDIT_LOGS'
  | 'SUBSCRIPTION';
