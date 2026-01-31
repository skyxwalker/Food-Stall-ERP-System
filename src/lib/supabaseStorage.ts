import { supabase } from './supabase';
import { User, Item, Sale, StockLog, CostEntry, OrderItem, Employee, ConfirmationMode } from '@/types';

// =====================================================
// USER OPERATIONS
// =====================================================

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return data.map(u => ({
    id: u.id,
    username: u.username,
    password: u.password,
    role: u.role as 'admin' | 'employee',
    employeeCode: u.employee_code,
    confirmationMode: (u.confirmation_mode || 'manual') as ConfirmationMode,
  }));
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    username: data.username,
    password: data.password,
    role: data.role as 'admin' | 'employee',
    employeeCode: data.employee_code,
    confirmationMode: (data.confirmation_mode || 'manual') as ConfirmationMode,
  };
}

// =====================================================
// EMPLOYEE OPERATIONS
// =====================================================

export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'employee')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  
  return data.map(e => ({
    id: e.id,
    username: e.username,
    employeeCode: e.employee_code || '',
    confirmationMode: (e.confirmation_mode || 'manual') as ConfirmationMode,
  }));
}

export async function addEmployee(employee: { 
  username: string; 
  password: string; 
  employeeCode: string; 
  confirmationMode: ConfirmationMode 
}): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      username: employee.username,
      password: employee.password,
      role: 'employee',
      employee_code: employee.employeeCode,
      confirmation_mode: employee.confirmationMode,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding employee:', error);
    return null;
  }
  
  return {
    id: data.id,
    username: data.username,
    employeeCode: data.employee_code || '',
    confirmationMode: (data.confirmation_mode || 'manual') as ConfirmationMode,
  };
}

export async function updateEmployee(employee: { 
  id: string; 
  username: string; 
  password?: string; 
  employeeCode: string; 
  confirmationMode: ConfirmationMode 
}): Promise<boolean> {
  const updateData: Record<string, unknown> = {
    username: employee.username,
    employee_code: employee.employeeCode,
    confirmation_mode: employee.confirmationMode,
    updated_at: new Date().toISOString(),
  };
  
  if (employee.password) {
    updateData.password = employee.password;
  }
  
  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', employee.id);
  
  if (error) {
    console.error('Error updating employee:', error);
    return false;
  }
  
  return true;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting employee:', error);
    return false;
  }
  
  return true;
}

export async function getEmployeeConfirmationMode(employeeId: string): Promise<ConfirmationMode> {
  const { data, error } = await supabase
    .from('users')
    .select('confirmation_mode')
    .eq('id', employeeId)
    .single();
  
  if (error || !data) {
    return 'manual';
  }
  
  return (data.confirmation_mode || 'manual') as ConfirmationMode;
}

// =====================================================
// ITEM OPERATIONS
// =====================================================

export async function getItems(): Promise<Item[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching items:', error);
    return [];
  }
  
  return data.map(item => ({
    id: item.id,
    name: item.name,
    price: parseFloat(item.price),
    stockType: item.stock_type as 'fixed' | 'unlimited',
    stockQty: item.stock_qty,
    assignedEmployeeId: item.assigned_employee_id || '',
    costPerUnit: parseFloat(item.cost_per_unit),
  }));
}

export async function addItem(item: Omit<Item, 'id'>): Promise<Item | null> {
  const { data, error } = await supabase
    .from('items')
    .insert({
      name: item.name,
      price: item.price,
      stock_type: item.stockType,
      stock_qty: item.stockQty,
      assigned_employee_id: item.assignedEmployeeId || null,
      cost_per_unit: item.costPerUnit,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding item:', error);
    return null;
  }
  
  // Add initial stock log
  await addStockLog({
    itemId: data.id,
    change: item.stockQty,
    reason: 'initial',
    date: new Date().toISOString(),
  });
  
  return {
    id: data.id,
    name: data.name,
    price: parseFloat(data.price),
    stockType: data.stock_type as 'fixed' | 'unlimited',
    stockQty: data.stock_qty,
    assignedEmployeeId: data.assigned_employee_id || '',
    costPerUnit: parseFloat(data.cost_per_unit),
  };
}

export async function updateItem(item: Item): Promise<boolean> {
  // Get old item for stock log comparison
  const { data: oldItem } = await supabase
    .from('items')
    .select('stock_qty')
    .eq('id', item.id)
    .single();
  
  const { error } = await supabase
    .from('items')
    .update({
      name: item.name,
      price: item.price,
      stock_type: item.stockType,
      stock_qty: item.stockQty,
      assigned_employee_id: item.assignedEmployeeId || null,
      cost_per_unit: item.costPerUnit,
      updated_at: new Date().toISOString(),
    })
    .eq('id', item.id);
  
  if (error) {
    console.error('Error updating item:', error);
    return false;
  }
  
  // Add stock log if quantity changed
  if (oldItem && oldItem.stock_qty !== item.stockQty) {
    await addStockLog({
      itemId: item.id,
      change: item.stockQty - oldItem.stock_qty,
      reason: 'admin_update',
      date: new Date().toISOString(),
    });
  }
  
  return true;
}

export async function deleteItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting item:', error);
    return false;
  }
  
  return true;
}

// =====================================================
// SALE OPERATIONS
// =====================================================

export async function getSales(): Promise<Sale[]> {
  const { data: salesData, error: salesError } = await supabase
    .from('sales')
    .select('*')
    .order('date', { ascending: false });
  
  if (salesError) {
    console.error('Error fetching sales:', salesError);
    return [];
  }
  
  // Fetch order items for all sales
  const saleIds = salesData.map(s => s.id);
  if (saleIds.length === 0) return [];
  
  const { data: orderItemsData, error: orderItemsError } = await supabase
    .from('order_items')
    .select('*')
    .in('sale_id', saleIds);
  
  if (orderItemsError) {
    console.error('Error fetching order items:', orderItemsError);
    return [];
  }
  
  // Map order items to sales
  const orderItemsBySale = (orderItemsData || []).reduce((acc, item) => {
    if (!acc[item.sale_id]) acc[item.sale_id] = [];
    acc[item.sale_id].push({
      itemId: item.item_id,
      itemName: item.item_name,
      qty: item.qty,
      price: parseFloat(item.price),
      cost: parseFloat(item.cost),
      employeeId: item.employee_id || '',
      status: item.status as 'pending' | 'done',
    });
    return acc;
  }, {} as Record<string, OrderItem[]>);
  
  return salesData.map(sale => ({
    id: sale.id,
    date: sale.date,
    tokenNumber: sale.token_number || 1,
    items: orderItemsBySale[sale.id] || [],
    totalAmount: parseFloat(sale.total_amount),
    totalCost: parseFloat(sale.total_cost),
    paymentMethod: sale.payment_method as 'cash' | 'upi' | 'credit',
    creditCustomerName: sale.credit_customer_name,
  }));
}

export async function addSale(saleData: Omit<Sale, 'id'>): Promise<Sale | null> {
  // Get today's date for token number calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  
  // Get the highest token number for today
  const { data: lastSale } = await supabase
    .from('sales')
    .select('token_number')
    .gte('date', todayISO)
    .order('token_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  const tokenNumber = (lastSale?.token_number || 0) + 1;
  
  // Insert sale
  const { data: sale, error: saleError } = await supabase
    .from('sales')
    .insert({
      date: saleData.date,
      token_number: tokenNumber,
      total_amount: saleData.totalAmount,
      total_cost: saleData.totalCost,
      payment_method: saleData.paymentMethod,
      credit_customer_name: saleData.creditCustomerName,
    })
    .select()
    .single();
  
  if (saleError) {
    console.error('Error adding sale:', saleError);
    return null;
  }
  
  // Insert order items
  const orderItems = saleData.items.map(item => ({
    sale_id: sale.id,
    item_id: item.itemId,
    item_name: item.itemName,
    qty: item.qty,
    price: item.price,
    cost: item.cost,
    employee_id: item.employeeId || null,
    status: item.status,
  }));
  
  const { error: orderItemsError } = await supabase
    .from('order_items')
    .insert(orderItems);
  
  if (orderItemsError) {
    console.error('Error adding order items:', orderItemsError);
  }
  
  // Update stock for fixed items and add stock logs
  for (const item of saleData.items) {
    const { data: itemData } = await supabase
      .from('items')
      .select('stock_type, stock_qty')
      .eq('id', item.itemId)
      .single();
    
    if (itemData && itemData.stock_type === 'fixed') {
      await supabase
        .from('items')
        .update({ stock_qty: Math.max(0, itemData.stock_qty - item.qty) })
        .eq('id', item.itemId);
      
      await addStockLog({
        itemId: item.itemId,
        change: -item.qty,
        reason: 'sale',
        date: new Date().toISOString(),
      });
    }
  }
  
  return {
    id: sale.id,
    date: sale.date,
    tokenNumber: sale.token_number || tokenNumber,
    items: saleData.items,
    totalAmount: parseFloat(sale.total_amount),
    totalCost: parseFloat(sale.total_cost),
    paymentMethod: sale.payment_method as 'cash' | 'upi' | 'credit',
    creditCustomerName: sale.credit_customer_name,
  };
}

export async function updateSaleItemStatus(saleId: string, itemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('order_items')
    .update({ status: 'done' })
    .eq('sale_id', saleId)
    .eq('item_id', itemId);
  
  if (error) {
    console.error('Error updating order item status:', error);
    return false;
  }
  
  return true;
}

export async function updateSalePaymentMethod(saleId: string, paymentMethod: 'cash' | 'upi' | 'credit'): Promise<boolean> {
  const { error } = await supabase
    .from('sales')
    .update({
      payment_method: paymentMethod,
      credit_customer_name: null,
    })
    .eq('id', saleId);
  
  if (error) {
    console.error('Error updating sale payment method:', error);
    return false;
  }
  
  return true;
}

// =====================================================
// STOCK LOG OPERATIONS
// =====================================================

export async function getStockLogs(): Promise<StockLog[]> {
  const { data, error } = await supabase
    .from('stock_logs')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching stock logs:', error);
    return [];
  }
  
  return data.map(log => ({
    id: log.id,
    itemId: log.item_id,
    change: log.change,
    reason: log.reason as 'sale' | 'admin_update' | 'initial',
    date: log.date,
  }));
}

export async function addStockLog(log: Omit<StockLog, 'id'>): Promise<boolean> {
  const { error } = await supabase
    .from('stock_logs')
    .insert({
      item_id: log.itemId,
      change: log.change,
      reason: log.reason,
      date: log.date,
    });
  
  if (error) {
    console.error('Error adding stock log:', error);
    return false;
  }
  
  return true;
}

// =====================================================
// COST ENTRY OPERATIONS
// =====================================================

export async function getCostEntries(): Promise<CostEntry[]> {
  const { data: entries, error: entriesError } = await supabase
    .from('cost_entries')
    .select('*')
    .order('date', { ascending: false });
  
  if (entriesError) {
    console.error('Error fetching cost entries:', entriesError);
    return [];
  }
  
  // Fetch item associations
  const entryIds = entries.map(e => e.id);
  const { data: entryItems, error: entryItemsError } = await supabase
    .from('cost_entry_items')
    .select('*')
    .in('cost_entry_id', entryIds);
  
  if (entryItemsError) {
    console.error('Error fetching cost entry items:', entryItemsError);
    return [];
  }
  
  // Map items to entries
  const itemsByEntry = entryItems.reduce((acc, item) => {
    if (!acc[item.cost_entry_id]) acc[item.cost_entry_id] = [];
    acc[item.cost_entry_id].push(item.item_id);
    return acc;
  }, {} as Record<string, string[]>);
  
  return entries.map(entry => ({
    id: entry.id,
    itemIds: itemsByEntry[entry.id] || [],
    totalCost: parseFloat(entry.total_cost),
    description: entry.description,
    commonName: entry.common_name,
    costType: (entry.cost_type || (entry.common_name ? 'combined' : 'individual')) as 'individual' | 'combined' | 'general',
    date: entry.date,
  }));
}

export async function addCostEntry(entry: Omit<CostEntry, 'id'>): Promise<CostEntry | null> {
  const { data, error } = await supabase
    .from('cost_entries')
    .insert({
      total_cost: entry.totalCost,
      description: entry.description,
      common_name: entry.commonName,
      cost_type: entry.costType,
      date: entry.date,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding cost entry:', error);
    return null;
  }
  
  // Insert item associations (only for non-general costs)
  if (entry.itemIds.length > 0 && entry.costType !== 'general') {
    const itemAssociations = entry.itemIds.map(itemId => ({
      cost_entry_id: data.id,
      item_id: itemId,
    }));
    
    const { error: itemsError } = await supabase
      .from('cost_entry_items')
      .insert(itemAssociations);
    
    if (itemsError) {
      console.error('Error adding cost entry items:', itemsError);
    }
  }
  
  return {
    id: data.id,
    itemIds: entry.itemIds,
    totalCost: parseFloat(data.total_cost),
    description: data.description,
    commonName: data.common_name,
    costType: (data.cost_type || entry.costType) as 'individual' | 'combined' | 'general',
    date: data.date,
  };
}

export async function updateCostEntry(entry: CostEntry): Promise<boolean> {
  const { error } = await supabase
    .from('cost_entries')
    .update({
      total_cost: entry.totalCost,
      description: entry.description,
      common_name: entry.commonName,
      cost_type: entry.costType,
      date: entry.date,
    })
    .eq('id', entry.id);
  
  if (error) {
    console.error('Error updating cost entry:', error);
    return false;
  }
  
  // Update item associations - delete existing and insert new (only for non-general)
  await supabase
    .from('cost_entry_items')
    .delete()
    .eq('cost_entry_id', entry.id);
  
  if (entry.itemIds.length > 0 && entry.costType !== 'general') {
    const itemAssociations = entry.itemIds.map(itemId => ({
      cost_entry_id: entry.id,
      item_id: itemId,
    }));
    
    await supabase
      .from('cost_entry_items')
      .insert(itemAssociations);
  }
  
  return true;
}

export async function deleteCostEntry(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('cost_entries')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting cost entry:', error);
    return false;
  }
  
  return true;
}
