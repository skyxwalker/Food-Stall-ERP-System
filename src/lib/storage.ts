import { User, Item, Sale, StockLog, CostEntry } from '@/types';

const STORAGE_KEYS = {
  USERS: 'foodstall_users',
  ITEMS: 'foodstall_items',
  SALES: 'foodstall_sales',
  STOCK_LOGS: 'foodstall_stock_logs',
  CURRENT_USER: 'foodstall_current_user',
  COST_ENTRIES: 'foodstall_cost_entries',
};

// Initialize default data
const defaultUsers: User[] = [
  { id: '1', username: 'Admin123', password: 'Admin123', role: 'admin', employeeCode: null, confirmationMode: 'manual' },
  { id: '2', username: 'emp1', password: 'emp1', role: 'employee', employeeCode: 'emp1', confirmationMode: 'manual' },
  { id: '3', username: 'emp2', password: 'emp2', role: 'employee', employeeCode: 'emp2', confirmationMode: 'manual' },
  { id: '4', username: 'emp3', password: 'emp3', role: 'employee', employeeCode: 'emp3', confirmationMode: 'manual' },
  { id: '5', username: 'emp4', password: 'emp4', role: 'employee', employeeCode: 'emp4', confirmationMode: 'auto' },
];

// Generic storage helpers
function getItem<T>(key: string, defaultValue: T): T {
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Users
export function getUsers(): User[] {
  return getItem(STORAGE_KEYS.USERS, defaultUsers);
}

export function setUsers(users: User[]): void {
  setItem(STORAGE_KEYS.USERS, users);
}

export function initializeUsers(): void {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    setUsers(defaultUsers);
  }
}

// Current User
export function getCurrentUser(): User | null {
  return getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
}

export function setCurrentUser(user: User | null): void {
  setItem(STORAGE_KEYS.CURRENT_USER, user);
}

// Items
export function getItems(): Item[] {
  return getItem<Item[]>(STORAGE_KEYS.ITEMS, []);
}

export function setItems(items: Item[]): void {
  setItem(STORAGE_KEYS.ITEMS, items);
}

export function addItem(item: Item): void {
  const items = getItems();
  items.push(item);
  setItems(items);
}

export function updateItem(updatedItem: Item): void {
  const items = getItems();
  const index = items.findIndex(i => i.id === updatedItem.id);
  if (index !== -1) {
    items[index] = updatedItem;
    setItems(items);
  }
}

export function deleteItem(id: string): void {
  const items = getItems().filter(i => i.id !== id);
  setItems(items);
}

// Sales
export function getSales(): Sale[] {
  return getItem<Sale[]>(STORAGE_KEYS.SALES, []);
}

export function setSales(sales: Sale[]): void {
  setItem(STORAGE_KEYS.SALES, sales);
}

export function addSale(sale: Sale): void {
  const sales = getSales();
  sales.push(sale);
  setSales(sales);
}

export function updateSale(updatedSale: Sale): void {
  const sales = getSales();
  const index = sales.findIndex(s => s.id === updatedSale.id);
  if (index !== -1) {
    sales[index] = updatedSale;
    setSales(sales);
  }
}

// Stock Logs
export function getStockLogs(): StockLog[] {
  return getItem<StockLog[]>(STORAGE_KEYS.STOCK_LOGS, []);
}

export function addStockLog(log: StockLog): void {
  const logs = getStockLogs();
  logs.push(log);
  setItem(STORAGE_KEYS.STOCK_LOGS, logs);
}

// Cost Entries
export function getCostEntries(): CostEntry[] {
  return getItem<CostEntry[]>(STORAGE_KEYS.COST_ENTRIES, []);
}

export function setCostEntries(entries: CostEntry[]): void {
  setItem(STORAGE_KEYS.COST_ENTRIES, entries);
}

export function addCostEntry(entry: CostEntry): void {
  const entries = getCostEntries();
  entries.push(entry);
  setCostEntries(entries);
}

export function updateCostEntry(updatedEntry: CostEntry): void {
  const entries = getCostEntries();
  const index = entries.findIndex(e => e.id === updatedEntry.id);
  if (index !== -1) {
    entries[index] = updatedEntry;
    setCostEntries(entries);
  }
}

export function deleteCostEntry(id: string): void {
  const entries = getCostEntries().filter(e => e.id !== id);
  setCostEntries(entries);
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
