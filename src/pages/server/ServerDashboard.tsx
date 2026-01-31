import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock } from 'lucide-react';
import { ServerOrderCard, type ServerOrderItem } from '@/components/server/ServerOrderCard';

export default function ServerDashboard() {
  const { sales } = useData();

  // Group all orders by token/order, sorted latest first
  const allOrders = useMemo(() => {
    const result: Array<{
      saleId: string;
      tokenNumber: number;
      orderTime: Date;
      status: 'pending' | 'done';
      items: ServerOrderItem[];
    }> = [];

    sales.forEach((sale) => {
      const orderItems: ServerOrderItem[] = sale.items.map((it) => ({
        itemId: it.itemId,
        itemName: it.itemName,
        qty: it.qty,
        status: it.status,
      }));

      const status: 'pending' | 'done' = orderItems.some((i) => i.status === 'pending')
        ? 'pending'
        : 'done';

      result.push({
        saleId: sale.id,
        tokenNumber: sale.tokenNumber,
        orderTime: new Date(sale.date),
        status,
        items: orderItems,
      });
    });

    // Sort by latest first
    return result.sort((a, b) => b.orderTime.getTime() - a.orderTime.getTime());
  }, [sales]);

  const pendingOrders = allOrders.filter((o) => o.status === 'pending');
  const completedOrders = allOrders.filter((o) => o.status === 'done');

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-3xl font-bold">{pendingOrders.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed Orders</p>
              <p className="text-3xl font-bold">{completedOrders.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Orders */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          <h2 className="text-xl font-semibold">Pending Orders</h2>
          <Badge variant="secondary">{pendingOrders.length}</Badge>
        </div>

        {pendingOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending orders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <ServerOrderCard
                key={order.saleId}
                tokenNumber={order.tokenNumber}
                orderTimeLabel={order.orderTime.toLocaleString()}
                items={order.items}
                isCompleted={order.status === 'done'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed Orders */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success" />
          <h2 className="text-xl font-semibold">Completed Orders</h2>
          <Badge variant="secondary">{completedOrders.length}</Badge>
        </div>

        {completedOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No completed orders</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {completedOrders.map((order) => (
              <ServerOrderCard
                key={order.saleId}
                tokenNumber={order.tokenNumber}
                orderTimeLabel={order.orderTime.toLocaleString()}
                items={order.items}
                isCompleted={order.status === 'done'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}