import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hash } from 'lucide-react';

export type ServerOrderItem = {
  itemId: string;
  itemName: string;
  qty: number;
  status: 'pending' | 'done';
};

export function ServerOrderCard(props: {
  tokenNumber: number;
  orderTimeLabel: string;
  items: ServerOrderItem[];
  isCompleted: boolean;
}) {
  const { tokenNumber, orderTimeLabel, items, isCompleted } = props;

  return (
    <Card className={isCompleted ? "border-l-4 border-l-[#16a249]" : "border-l-4 border-l-[#e7b008]"}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-10 ${isCompleted ? 'bg-[#16a249]' : 'bg-[#e7b008]'} rounded-lg flex items-center justify-center font-bold text-white`}>
              <div className="flex items-center gap-1">
                <Hash className="w-4 h-4" />
                <span className="text-lg">{tokenNumber}</span>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">{orderTimeLabel}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs">
              <span className="text-muted-foreground">Items:</span>{' '}
              <span className="font-semibold">{items.length}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {items.map((it) => (
            <div key={it.itemId} className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">
                    {it.itemName}
                  </p>
                  <span className="text-sm text-muted-foreground">×{it.qty}</span>
                </div>
              </div>
              <Badge className={`shrink-0 capitalize ${it.status === 'pending' ? 'bg-[#e7b008] hover:bg-[#e7b008] text-white' : 'bg-[#16a249] hover:bg-[#16a249] text-white'}`}>
                {it.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}