// User types
export type UserRole = 'admin' | 'employee' | 'server';
export type ConfirmationMode = 'manual' | 'auto';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  employeeCode: string | null;
  confirmationMode: ConfirmationMode;
}

// Employee type for management
export interface Employee {
  id: string;
  username: string;
  employeeCode: string;
  confirmationMode: ConfirmationMode;
}

// Item types
export type StockType = 'fixed' | 'unlimited';

export interface Item {
  id: string;
  name: string;
  price: number;
  stockType: StockType;
  stockQty: number;
  assignedEmployeeId: string;
  costPerUnit: number;
}

// Sale types
export type PaymentMethod = 'cash' | 'upi' | 'credit';
export type OrderItemStatus = 'pending' | 'done';

export interface OrderItem {
  itemId: string;
  itemName: string;
  qty: number;
  price: number;
  cost: number;
  employeeId: string;
  status: OrderItemStatus;
}

export interface Sale {
  id: string;
  date: string;
  tokenNumber: number;
  items: OrderItem[];
  totalAmount: number;
  totalCost: number;
  paymentMethod: PaymentMethod;
  creditCustomerName: string | null;
}

// Cart types
export interface CartItem {
  item: Item;
  qty: number;
}

// Stock log
export interface StockLog {
  id: string;
  itemId: string;
  change: number;
  reason: 'sale' | 'admin_update' | 'initial';
  date: string;
}

// Cost entry for tracking ingredient costs (single or grouped items)
export type CostType = 'individual' | 'combined' | 'general';

export interface CostEntry {
  id: string;
  itemIds: string[]; // Can be 1 or more items that share this cost (empty for general costs)
  totalCost: number;
  description?: string; // Optional description like "lemonade ingredients"
  commonName?: string; // Name for grouped costs shown in reports (e.g., "Juice Ingredients")
  costType: CostType; // Type of cost entry
  date: string;
}
