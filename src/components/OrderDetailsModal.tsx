import { Sale } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Hash } from 'lucide-react';

interface OrderDetailsModalProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailsModal({ sale, open, onOpenChange }: OrderDetailsModalProps) {
  if (!sale) return null;

  const allDone = sale.items.every(item => item.status === 'done');
  const allPending = sale.items.every(item => item.status === 'pending');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-1 text-base px-3 py-1">
                <Hash className="w-4 h-4" />
                Token {sale.tokenNumber}
              </Badge>
              {allDone ? (
                <Badge variant="default" className="bg-success text-success-foreground">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              ) : allPending ? (
                <Badge variant="secondary" className="bg-warning text-warning-foreground">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  In Progress
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {new Date(sale.date).toLocaleString()}
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Items</h4>
            <div className="space-y-2">
              {sale.items.map((item, index) => (
                <div
                  key={`${item.itemId}-${index}`}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    item.status === 'done'
                      ? 'bg-success/5 border-success/20'
                      : 'bg-warning/5 border-warning/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.status === 'done' ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <Clock className="w-4 h-4 text-warning" />
                    )}
                    <div>
                      <span className="font-medium">{item.itemName}</span>
                      <span className="text-muted-foreground ml-2">×{item.qty}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">₹{item.price * item.qty}</span>
                    <Badge
                      variant={item.status === 'done' ? 'default' : 'secondary'}
                      className={item.status === 'done' 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-warning text-warning-foreground'
                      }
                    >
                      {item.status === 'done' ? 'Done' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <Badge variant="outline" className="capitalize">
                {sale.paymentMethod}
              </Badge>
            </div>
            {sale.creditCustomerName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium">{sale.creditCustomerName}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>₹{sale.totalAmount}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
