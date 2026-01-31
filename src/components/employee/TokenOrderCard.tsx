import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Hash } from 'lucide-react';

export type TokenOrderItem = {
  itemId: string;
  itemName: string;
  qty: number;
  status: 'pending' | 'done';
};

export function TokenOrderCard(props: {
  tokenNumber: number;
  orderTimeLabel: string;
  items: TokenOrderItem[];
  highlight?: boolean;
  loadingKey?: string | null;
  onMarkDone: (itemId: string) => void;
  saleId: string;
}) {
  const { tokenNumber, orderTimeLabel, items, highlight, loadingKey, onMarkDone, saleId } = props;

  return (
    <Card
      className={
        highlight
          ? 'border-2 border-primary bg-primary/5 shadow-lg'
          : 'border-l-4 border-l-warning'
      }
    >
      <CardContent className={highlight ? 'p-6' : 'p-4'}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={
                (highlight
                  ? 'w-14 h-14 bg-primary text-primary-foreground'
                  : 'w-10 h-10 bg-muted') +
                ' rounded-lg flex items-center justify-center font-bold'
              }
            >
              <div className="flex items-center gap-1">
                <Hash className={highlight ? 'w-5 h-5' : 'w-4 h-4'} />
                <span className={highlight ? 'text-xl' : 'text-lg'}>{tokenNumber}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={highlight ? 'default' : 'outline'} className={highlight ? 'px-3 py-1' : ''}>
                  Token {tokenNumber}
                </Badge>
                <span className="text-sm text-muted-foreground">{orderTimeLabel}</span>
              </div>
              {highlight && (
                <p className="text-sm text-primary font-medium mt-1">Serve this order first</p>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className={highlight ? 'text-sm' : 'text-xs'}>
              <span className="text-muted-foreground">Items:</span>{' '}
              <span className="font-semibold">{items.length}</span>
            </div>
          </div>
        </div>

        <div className={highlight ? 'mt-5 space-y-3' : 'mt-4 space-y-2'}>
          {items.map((it) => {
            const key = `${saleId}-${it.itemId}`;
            const isLoading = loadingKey === key;
            const isPending = it.status === 'pending';

            return (
              <div key={it.itemId} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={highlight ? 'font-semibold text-lg truncate' : 'font-medium truncate'}>
                      {it.itemName}
                    </p>
                    <Badge variant="secondary" className="shrink-0">
                      ×{it.qty}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{it.status}</p>
                </div>

                {isPending ? (
                  <Button
                    size={highlight ? 'lg' : 'default'}
                    className={highlight ? 'px-6 gap-2' : 'gap-2'}
                    onClick={() => onMarkDone(it.itemId)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      'Saving...'
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Done
                      </>
                    )}
                  </Button>
                ) : (
                  <Badge variant="outline" className="capitalize">
                    Completed
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
