import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  CreditCard,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  Banknote,
  Smartphone,
  Hash,
} from 'lucide-react';
import { PaymentMethod, Sale } from '@/types';
import { OrderDetailsModal } from '@/components/OrderDetailsModal';
import { downloadFoodStallReportPdf } from '@/lib/reportPdf';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  'hsl(var(--destructive))',
  'hsl(220, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(340, 70%, 50%)',
  'hsl(100, 70%, 50%)',
  'hsl(50, 70%, 50%)',
];

export default function Reports() {
  const { sales, items, costEntries, updateSalePaymentMethod } = useData();
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Payment confirmation modal state
  const [confirmPayment, setConfirmPayment] = useState<{
    customer: string;
    amount: number;
    saleIds: string[];
    method: PaymentMethod;
  } | null>(null);
  
  // Order details modal state
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);

  // Filter sales by date
  const filteredSales = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    
    return sales.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= from && saleDate <= to;
    });
  }, [sales, dateFrom, dateTo]);

  // Calculate summary stats
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);

  // Payment method breakdown
  const paymentBreakdown = {
    cash: filteredSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0),
    upi: filteredSales.filter(s => s.paymentMethod === 'upi').reduce((sum, s) => sum + s.totalAmount, 0),
    credit: filteredSales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + s.totalAmount, 0),
  };

  // Credit customers with sale IDs for payment confirmation
  const creditSales = filteredSales.filter(s => s.paymentMethod === 'credit');
  const creditByCustomer = creditSales.reduce((acc, s) => {
    const name = s.creditCustomerName || 'Unknown';
    if (!acc[name]) {
      acc[name] = { amount: 0, saleIds: [] };
    }
    acc[name].amount += s.totalAmount;
    acc[name].saleIds.push(s.id);
    return acc;
  }, {} as Record<string, { amount: number; saleIds: string[] }>);

  // Handle payment confirmation
  const handlePaymentConfirm = () => {
    if (confirmPayment) {
      confirmPayment.saleIds.forEach(saleId => {
        updateSalePaymentMethod(saleId, confirmPayment.method);
      });
      setConfirmPayment(null);
    }
  };

  // Calculate items sold (for pie chart)
  const itemsSold = useMemo(() => {
    const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    
    filteredSales.forEach(sale => {
      sale.items.forEach(orderItem => {
        if (!itemMap[orderItem.itemId]) {
          itemMap[orderItem.itemId] = {
            name: orderItem.itemName,
            qty: 0,
            revenue: 0,
          };
        }
        itemMap[orderItem.itemId].qty += orderItem.qty;
        itemMap[orderItem.itemId].revenue += orderItem.price * orderItem.qty;
      });
    });
    
    return Object.entries(itemMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.qty - a.qty);
  }, [filteredSales]);

  // Pie chart data
  const pieChartData = itemsSold.slice(0, 10).map((item, index) => ({
    name: item.name,
    value: item.qty,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const pieChartConfig = pieChartData.reduce((acc, item) => {
    acc[item.name] = { label: item.name, color: item.fill };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  // Calculate detailed profit/loss - grouping by common name for shared costs
  const itemProfitLoss = useMemo(() => {
    // Track grouped entries and individual items
    type ProfitItem = {
      id: string;
      name: string;
      qtySold: number;
      revenue: number;
      assignedCost: number;
      isGrouped: boolean;
      isGeneral?: boolean;
      itemNames?: string[];
    };
    
    const result: ProfitItem[] = [];
    const processedItemIds = new Set<string>();
    
    // First, calculate revenue and qty sold per item
    const itemSalesData: Record<string, { qtySold: number; revenue: number }> = {};
    items.forEach(item => {
      itemSalesData[item.id] = { qtySold: 0, revenue: 0 };
    });
    
    filteredSales.forEach(sale => {
      sale.items.forEach(orderItem => {
        if (itemSalesData[orderItem.itemId]) {
          itemSalesData[orderItem.itemId].qtySold += orderItem.qty;
          itemSalesData[orderItem.itemId].revenue += orderItem.price * orderItem.qty;
        }
      });
    });
    
    // Process combined cost entries as grouped items
    costEntries
      .filter(entry => entry.costType === 'combined')
      .forEach(entry => {
        const groupedRevenue = entry.itemIds.reduce((sum, id) => sum + (itemSalesData[id]?.revenue || 0), 0);
        const groupedQty = entry.itemIds.reduce((sum, id) => sum + (itemSalesData[id]?.qtySold || 0), 0);
        const itemNames = entry.itemIds.map(id => items.find(i => i.id === id)?.name || 'Unknown');
        
        // Check if we already have this group
        const existingGroup = result.find(r => r.name === entry.commonName);
        if (existingGroup) {
          existingGroup.assignedCost += entry.totalCost;
        } else {
          result.push({
            id: `group-${entry.id}`,
            name: entry.commonName || 'Combined Cost',
            qtySold: groupedQty,
            revenue: groupedRevenue,
            assignedCost: entry.totalCost,
            isGrouped: true,
            itemNames,
          });
        }
        
        // Mark these items as processed
        entry.itemIds.forEach(id => processedItemIds.add(id));
      });
    
    // Process individual items (not in any grouped cost)
    items.forEach(item => {
      if (processedItemIds.has(item.id)) return;
      
      const salesData = itemSalesData[item.id] || { qtySold: 0, revenue: 0 };
      
      // Calculate costs for this item from individual entries
      let assignedCost = 0;
      costEntries
        .filter(entry => entry.costType === 'individual' && entry.itemIds.includes(item.id))
        .forEach(entry => {
          assignedCost += entry.totalCost;
        });
      
      if (salesData.qtySold > 0 || assignedCost > 0) {
        result.push({
          id: item.id,
          name: item.name,
          qtySold: salesData.qtySold,
          revenue: salesData.revenue,
          assignedCost,
          isGrouped: false,
        });
      }
    });
    
    // Add general costs
    costEntries
      .filter(entry => entry.costType === 'general')
      .forEach(entry => {
        result.push({
          id: `general-${entry.id}`,
          name: entry.commonName || 'General Cost',
          qtySold: 0,
          revenue: 0,
          assignedCost: entry.totalCost,
          isGrouped: false,
          isGeneral: true,
        });
      });
    
    return result
      .map(item => ({
        ...item,
        profit: item.revenue - item.assignedCost,
        margin: item.revenue > 0 ? ((item.revenue - item.assignedCost) / item.revenue) * 100 : (item.assignedCost > 0 ? -100 : 0),
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [items, filteredSales, costEntries]);

  const totalCostAssigned = itemProfitLoss.reduce((sum, item) => sum + item.assignedCost, 0);
  const totalProfit = totalRevenue - totalCostAssigned;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-1">Analyze your sales and profits</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() =>
              downloadFoodStallReportPdf({
                items,
                sales: filteredSales,
                dateFrom,
                dateTo,
                totalCost: totalCostAssigned,
                totalNetSales: totalRevenue,
                totalProfitOrLoss: totalProfit,
              })
            }
          >
            Export PDF
          </Button>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">From:</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">To:</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders</p>
                <p className="text-2xl font-bold">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-info rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-info-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Profit</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ₹{totalProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credit Due</p>
                <p className="text-2xl font-bold">₹{paymentBreakdown.credit.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart - Most Sold Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Most Sold Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pieChartData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No sales data available for the selected period
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <ChartContainer config={pieChartConfig} className="h-[300px] w-full lg:w-1/2">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              
              <div className="w-full lg:w-1/2 space-y-2">
                {itemsSold.slice(0, 10).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold">{item.qty}</span>
                      <span className="text-muted-foreground ml-1">sold</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Profit/Loss by Item */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Item-wise Profit & Loss
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {itemProfitLoss.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No items with sales or costs found. Add cost entries in the Costs page.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost Assigned</TableHead>
                  <TableHead className="text-right">Profit/Loss</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemProfitLoss.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>
                        {item.name}
                        {item.isGrouped && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Combined
                          </Badge>
                        )}
                        {item.isGeneral && (
                          <Badge variant="secondary" className="ml-2 text-xs bg-info/20 text-info">
                            General
                          </Badge>
                        )}
                      </div>
                      {item.isGrouped && item.itemNames && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.itemNames.join(', ')}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.isGeneral ? '-' : item.qtySold}</TableCell>
                    <TableCell className="text-right">{item.isGeneral ? '-' : `₹${item.revenue.toLocaleString()}`}</TableCell>
                    <TableCell className="text-right">₹{Math.round(item.assignedCost).toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-bold ${item.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      <div className="flex items-center justify-end gap-1">
                        {item.profit >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        ₹{Math.round(item.profit).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.isGeneral ? (
                        <Badge variant="secondary">N/A</Badge>
                      ) : (
                        <Badge variant={item.margin >= 30 ? 'default' : item.margin >= 0 ? 'secondary' : 'destructive'}>
                          {item.margin.toFixed(1)}%
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{itemProfitLoss.reduce((sum, i) => sum + i.qtySold, 0)}</TableCell>
                  <TableCell className="text-right">₹{totalRevenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{Math.round(totalCostAssigned).toLocaleString()}</TableCell>
                  <TableCell className={`text-right ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    ₹{Math.round(totalProfit).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="credit">Credit Outstanding</TabsTrigger>
          <TabsTrigger value="orders">All Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { method: 'Cash', amount: paymentBreakdown.cash, color: 'bg-success' },
                  { method: 'UPI', amount: paymentBreakdown.upi, color: 'bg-info' },
                  { method: 'Credit', amount: paymentBreakdown.credit, color: 'bg-warning' },
                ].map(({ method, amount, color }) => (
                  <div key={method} className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="font-medium">{method}</span>
                    </div>
                    <p className="text-2xl font-bold">₹{amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : 0}% of total
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit">
          <Card>
            <CardHeader>
              <CardTitle>Credit Outstanding by Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(creditByCustomer).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No credit sales in selected date range
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(creditByCustomer)
                    .sort((a, b) => b[1].amount - a[1].amount)
                    .map(([customer, data]) => (
                      <div
                        key={customer}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg gap-4"
                      >
                        <div className="flex-1">
                          <span className="font-medium">{customer}</span>
                          <p className="text-2xl font-bold mt-1">₹{data.amount.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => setConfirmPayment({
                              customer,
                              amount: data.amount,
                              saleIds: data.saleIds,
                              method: 'cash'
                            })}
                          >
                            <Banknote className="w-4 h-4" />
                            Cash
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => setConfirmPayment({
                              customer,
                              amount: data.amount,
                              saleIds: data.saleIds,
                              method: 'upi'
                            })}
                          >
                            <Smartphone className="w-4 h-4" />
                            UPI
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSales.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No orders in selected date range
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Token</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...filteredSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale) => (
                      <TableRow 
                        key={sale.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedOrder(sale)}
                      >
                        <TableCell>
                          <Badge variant="default" className="gap-1">
                            <Hash className="w-3 h-3" />
                            {sale.tokenNumber}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(sale.date).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {sale.items.map(i => `${i.itemName} ×${i.qty}`).join(', ')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {sale.paymentMethod}
                          </Badge>
                          {sale.creditCustomerName && (
                            <span className="text-sm text-muted-foreground ml-2">
                              ({sale.creditCustomerName})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{sale.totalAmount}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Confirmation Modal */}
      <Dialog open={!!confirmPayment} onOpenChange={(open) => !open && setConfirmPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment Received</DialogTitle>
            <DialogDescription>
              Confirm that you have received payment from <strong>{confirmPayment?.customer}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold">₹{confirmPayment?.amount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <Badge className="text-lg px-3 py-1 capitalize">
                  {confirmPayment?.method === 'cash' ? (
                    <><Banknote className="w-4 h-4 mr-2" /> Cash</>
                  ) : (
                    <><Smartphone className="w-4 h-4 mr-2" /> UPI</>
                  )}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPayment(null)}>
              Cancel
            </Button>
            <Button onClick={handlePaymentConfirm}>
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <OrderDetailsModal
        sale={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      />
    </div>
  );
}