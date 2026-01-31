import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, ChefHat } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { TokenOrderCard, type TokenOrderItem } from '@/components/employee/TokenOrderCard';

export default function TaskDashboard() {
  const { user } = useAuth();
  const { sales, updateSaleItemStatus } = useData();
  const [loadingTask, setLoadingTask] = useState<string | null>(null);

  // Group tasks by token/order (FIFO order - oldest pending first)
  const myOrders = useMemo(() => {
    if (!user?.id) return [] as Array<{
      saleId: string;
      tokenNumber: number;
      orderTime: Date;
      status: 'pending' | 'done';
      items: TokenOrderItem[];
    }>;

    const result: Array<{
      saleId: string;
      tokenNumber: number;
      orderTime: Date;
      status: 'pending' | 'done';
      items: TokenOrderItem[];
    }> = [];

    sales.forEach((sale) => {
      const myItems = sale.items.filter((it) => it.employeeId === user.id);
      if (myItems.length === 0) return;

      const orderItems: TokenOrderItem[] = myItems.map((it) => ({
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

    return result.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return a.orderTime.getTime() - b.orderTime.getTime();
    });
  }, [sales, user?.id]);

  const pendingOrders = myOrders.filter((o) => o.status === 'pending');
  const completedOrders = myOrders.filter((o) => o.status === 'done');

  const handleMarkDone = async (saleId: string, itemId: string) => {
    const taskKey = `${saleId}-${itemId}`;
    if (loadingTask) return;
    
    setLoadingTask(taskKey);
    try {
      await updateSaleItemStatus(saleId, itemId);
      toast.success('Task completed!', {
        description: 'Item marked as done.',
      });
    } finally {
      setLoadingTask(null);
    }
  };

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
              <p className="text-sm text-muted-foreground">Pending</p>
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
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-3xl font-bold">{completedOrders.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending tasks */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" />
          Pending Orders
        </h2>

        {pendingOrders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ChefHat className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">All caught up!</h3>
              <p className="text-muted-foreground">No pending orders right now</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((order, idx) => (
              <TokenOrderCard
                key={order.saleId}
                saleId={order.saleId}
                tokenNumber={order.tokenNumber}
                orderTimeLabel={order.orderTime.toLocaleTimeString()}
                items={order.items}
                highlight={idx === 0}
                loadingKey={loadingTask}
                onMarkDone={(itemId) => handleMarkDone(order.saleId, itemId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Completed orders (last 10) */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Recently Completed
          </h2>

          <div className="space-y-2">
            {completedOrders.slice(-10).reverse().map((order) => (
              <div
                key={`${order.saleId}-done`}
                className="p-3 bg-success/10 rounded-lg border border-success/20"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {order.items.map((i) => i.itemName).join(', ')}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {order.items.map((i) => `×${i.qty}`).join('  ')}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono gap-1 shrink-0">
                    Token {order.tokenNumber}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
