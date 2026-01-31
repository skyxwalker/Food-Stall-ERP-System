import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Item, Sale, CartItem, PaymentMethod, StockLog, CostEntry } from '@/types';
import * as supabaseStorage from '@/lib/supabaseStorage';

interface DataContextType {
  // Items
  items: Item[];
  addItem: (item: Omit<Item, 'id'>) => Promise<void>;
  updateItem: (item: Item) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  refreshItems: () => Promise<void>;
  
  // Sales
  sales: Sale[];
  addSale: (sale: Omit<Sale, 'id'>) => Promise<Sale | null>;
  updateSaleItemStatus: (saleId: string, itemId: string) => Promise<void>;
  updateSalePaymentMethod: (saleId: string, paymentMethod: PaymentMethod) => Promise<void>;
  refreshSales: () => Promise<void>;
  
  // Cart
  cart: CartItem[];
  addToCart: (item: Item) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCost: number;
  
  // Stock logs
  stockLogs: StockLog[];
  refreshStockLogs: () => Promise<void>;
  
  // Cost entries
  costEntries: CostEntry[];
  addCostEntry: (entry: Omit<CostEntry, 'id'>) => Promise<void>;
  updateCostEntry: (entry: CostEntry) => Promise<void>;
  deleteCostEntry: (id: string) => Promise<void>;
  refreshCostEntries: () => Promise<void>;
  
  // Loading state
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [costEntries, setCostEntries] = useState<CostEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshItems = useCallback(async () => {
    const data = await supabaseStorage.getItems();
    setItems(data);
  }, []);

  const refreshSales = useCallback(async () => {
    const data = await supabaseStorage.getSales();
    setSales(data);
  }, []);

  const refreshStockLogs = useCallback(async () => {
    const data = await supabaseStorage.getStockLogs();
    setStockLogs(data);
  }, []);

  const refreshCostEntries = useCallback(async () => {
    const data = await supabaseStorage.getCostEntries();
    setCostEntries(data);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        refreshItems(),
        refreshSales(),
        refreshStockLogs(),
        refreshCostEntries(),
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [refreshItems, refreshSales, refreshStockLogs, refreshCostEntries]);

  const addItem = async (itemData: Omit<Item, 'id'>) => {
    await supabaseStorage.addItem(itemData);
    await refreshItems();
    await refreshStockLogs();
  };

  const updateItem = async (item: Item) => {
    await supabaseStorage.updateItem(item);
    await refreshItems();
    await refreshStockLogs();
  };

  const deleteItem = async (id: string) => {
    await supabaseStorage.deleteItem(id);
    await refreshItems();
  };

  const addSale = async (saleData: Omit<Sale, 'id'>) => {
    const addedSale = await supabaseStorage.addSale(saleData);
    await Promise.all([refreshItems(), refreshSales(), refreshStockLogs()]);
    return addedSale;
  };

  const updateSaleItemStatus = async (saleId: string, itemId: string) => {
    await supabaseStorage.updateSaleItemStatus(saleId, itemId);
    await refreshSales();
  };

  const updateSalePaymentMethod = async (saleId: string, paymentMethod: PaymentMethod) => {
    await supabaseStorage.updateSalePaymentMethod(saleId, paymentMethod);
    await refreshSales();
  };

  // Cart functions (client-side only)
  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c =>
          c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const updateCartQty = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev =>
      prev.map(c => (c.item.id === itemId ? { ...c, qty } : c))
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  const cartCost = cart.reduce((sum, c) => sum + c.item.costPerUnit * c.qty, 0);

  // Cost entry functions
  const addCostEntry = async (entryData: Omit<CostEntry, 'id'>) => {
    await supabaseStorage.addCostEntry(entryData);
    await refreshCostEntries();
  };

  const updateCostEntryHandler = async (entry: CostEntry) => {
    await supabaseStorage.updateCostEntry(entry);
    await refreshCostEntries();
  };

  const deleteCostEntryHandler = async (id: string) => {
    await supabaseStorage.deleteCostEntry(id);
    await refreshCostEntries();
  };

  return (
    <DataContext.Provider
      value={{
        items,
        addItem,
        updateItem,
        deleteItem,
        refreshItems,
        sales,
        addSale,
        updateSaleItemStatus,
        updateSalePaymentMethod,
        refreshSales,
        cart,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        cartTotal,
        cartCost,
        stockLogs,
        refreshStockLogs,
        costEntries,
        addCostEntry,
        updateCostEntry: updateCostEntryHandler,
        deleteCostEntry: deleteCostEntryHandler,
        refreshCostEntries,
        isLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
