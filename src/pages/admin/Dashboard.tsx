import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Hash,
} from 'lucide-react';
import { Sale } from '@/types';
import { OrderDetailsModal } from '@/components/OrderDetailsModal';

export default function Dashboard() {
  const { items, sales } = useData();
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);

  // Calculate stats
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.date).toDateString() === today);
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const todayProfit = todaySales.reduce((sum, s) => sum + (s.totalAmount - s.totalCost), 0);
  
  const pendingOrders = sales.filter(s => 
    s.items.some(item => item.status === 'pending')
  ).length;
  
  const completedToday = todaySales.filter(s => 
    s.items.every(item => item.status === 'done')
  ).length;

  const lowStockItems = items.filter(i => i.stockType === 'fixed' && i.stockQty < 10);

  const stats = [
    {
      title: 'Total Items',
      value: items.length,
      icon: Package,
      color: 'bg-info',
    },
    {
      title: "Today's Sales",
      value: todaySales.length,
      icon: ShoppingCart,
      color: 'bg-primary',
    },
    {
      title: "Today's Revenue",
      value: `₹${todayRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-success',
    },
    {
      title: "Today's Profit",
      value: `₹${todayProfit.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-secondary',
    },
    {
      title: 'Pending Orders',
      value: pendingOrders,
      icon: Clock,
      color: 'bg-warning',
    },
    {
      title: 'Completed Today',
      value: completedToday,
      icon: CheckCircle,
      color: 'bg-accent',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's your stall overview.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-warning" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg border"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm px-2 py-1 bg-warning/20 text-warning-foreground rounded">
                    {item.stockQty} left
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Status Banner */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Order Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-warning/10 rounded-xl border border-warning/20">
              <div className="w-12 h-12 bg-warning rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-3xl font-bold text-warning">{pendingOrders}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-success/10 rounded-xl border border-success/20">
              <div className="w-12 h-12 bg-success rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed Today</p>
                <p className="text-3xl font-bold text-success">{completedToday}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent sales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySales.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No sales today yet. Start selling from the POS!
            </p>
          ) : (
            <div className="space-y-3">
              {[...todaySales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((sale) => {
                const allDone = sale.items.every(item => item.status === 'done');
                const allPending = sale.items.every(item => item.status === 'pending');
                
                return (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedOrder(sale)}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      allDone 
                        ? 'bg-success/5 border-success/20 hover:bg-success/10' 
                        : allPending 
                          ? 'bg-warning/5 border-warning/20 hover:bg-warning/10'
                          : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {allDone ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <Clock className="w-5 h-5 text-warning" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="gap-1">
                            <Hash className="w-3 h-3" />
                            Token {sale.tokenNumber}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {sale.items.length} items • {sale.paymentMethod.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{sale.totalAmount}</p>
                      <p className="text-sm text-success">
                        +₹{(sale.totalAmount - sale.totalCost).toFixed(0)} profit
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <OrderDetailsModal
        sale={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      />
    </div>
  );
}
