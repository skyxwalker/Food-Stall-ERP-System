import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { PaymentMethod, Employee, Sale } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Infinity,
  Package,
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import * as supabaseStorage from '@/lib/supabaseStorage';

export default function POS() {
  const { items, cart, addToCart, updateCartQty, removeFromCart, clearCart, cartTotal, cartCost, addSale } = useData();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [creditCustomer, setCreditCustomer] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load employees on mount
  useEffect(() => {
    const loadEmployees = async () => {
      const data = await supabaseStorage.getEmployees();
      setEmployees(data);
    };
    loadEmployees();
  }, []);

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setCheckoutOpen(true);
  };

  const handleProceedToConfirm = () => {
    if (paymentMethod === 'credit' && !creditCustomer.trim()) {
      toast.error('Please enter customer name for credit sale');
      return;
    }
    setCheckoutOpen(false);
    setConfirmOpen(true);
  };

  const confirmSale = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Determine status based on employee confirmation mode
      const getItemStatus = (employeeId: string): 'pending' | 'done' => {
        const employee = employees.find(e => e.id === employeeId);
        return employee?.confirmationMode === 'auto' ? 'done' : 'pending';
      };

      const sale = {
        date: new Date().toISOString(),
        tokenNumber: 0, // Will be calculated server-side
        items: cart.map(c => ({
          itemId: c.item.id,
          itemName: c.item.name,
          qty: c.qty,
          price: c.item.price,
          cost: c.item.costPerUnit,
          employeeId: c.item.assignedEmployeeId,
          status: getItemStatus(c.item.assignedEmployeeId),
        })),
        totalAmount: cartTotal,
        totalCost: cartCost,
        paymentMethod,
        creditCustomerName: paymentMethod === 'credit' ? creditCustomer.trim() : null,
      };

      const addedSale = await addSale(sale);
      if (addedSale) {
        setCompletedSale(addedSale);
        setSuccessOpen(true);
      }
      clearCart();
      setConfirmOpen(false);
      setPaymentMethod('cash');
      setCreditCustomer('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canAddToCart = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return false;
    if (item.stockType === 'unlimited') return true;
    
    const inCart = cart.find(c => c.item.id === itemId)?.qty || 0;
    return item.stockQty > inCart;
  };

  return (
    <div className="h-[calc(100vh-64px)] lg:h-screen flex flex-col lg:flex-row">
      {/* Items grid */}
      <div className="flex-1 p-4 lg:p-6 overflow-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Point of Sale</h1>
          <p className="text-muted-foreground">Tap items to add to cart</p>
        </div>

        {items.length === 0 ? (
          <Card className="h-[60%] flex items-center justify-center">
            <CardContent className="text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No items available</h3>
              <p className="text-muted-foreground">Add items from the Items page first</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {items.map((item) => {
              const inCart = cart.find(c => c.item.id === item.id)?.qty || 0;
              const outOfStock = item.stockType === 'fixed' && item.stockQty <= 0;
              
              return (
                <button
                  key={item.id}
                  onClick={() => canAddToCart(item.id) && addToCart(item)}
                  disabled={outOfStock}
                  className={`relative p-4 lg:p-6 rounded-xl border-2 text-left transition-all ${
                    outOfStock
                      ? 'bg-muted border-muted opacity-60 cursor-not-allowed'
                      : 'bg-card border-border hover:border-primary hover:shadow-lg active:scale-95'
                  }`}
                >
                  {inCart > 0 && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                      {inCart}
                    </div>
                  )}
                  
                  <h3 className="font-semibold text-base lg:text-lg mb-1 break-words">{item.name}</h3>
                  <p className="text-xl lg:text-2xl font-bold text-primary">₹{item.price}</p>
                  
                  <div className="mt-2 flex items-center gap-1">
                    {item.stockType === 'unlimited' ? (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Infinity className="w-3 h-3" />
                      </Badge>
                    ) : (
                      <Badge variant={item.stockQty < 10 ? 'destructive' : 'outline'} className="text-xs">
                        {item.stockQty} left
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart panel */}
      <div className="w-full lg:w-96 bg-card border-t lg:border-t-0 lg:border-l border-border flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Current Order</h2>
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground">
              Clear
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground">Cart is empty</p>
                <p className="text-sm text-muted-foreground/70">Tap items to add</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((cartItem) => (
                <div
                  key={cartItem.item.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{cartItem.item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{cartItem.item.price} × {cartItem.qty}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => updateCartQty(cartItem.item.id, cartItem.qty - 1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{cartItem.qty}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => canAddToCart(cartItem.item.id) && updateCartQty(cartItem.item.id, cartItem.qty + 1)}
                      disabled={!canAddToCart(cartItem.item.id)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="font-bold w-16 text-right">
                    ₹{cartItem.item.price * cartItem.qty}
                  </p>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-destructive hover:text-destructive"
                    onClick={() => removeFromCart(cartItem.item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer */}
        <div className="p-4 border-t border-border space-y-4">
          <div className="flex items-center justify-between text-lg">
            <span>Subtotal</span>
            <span className="font-bold">₹{cartTotal}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Estimated Profit</span>
            <span className="text-success font-medium">+₹{(cartTotal - cartCost).toFixed(0)}</span>
          </div>
          <Button
            size="lg"
            className="w-full text-lg h-14"
            onClick={handleCheckout}
            disabled={cart.length === 0}
          >
            Checkout · ₹{cartTotal}
          </Button>
        </div>
      </div>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center py-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-4xl font-bold text-primary">₹{cartTotal}</p>
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { method: 'cash' as const, icon: Banknote, label: 'Cash' },
                  { method: 'upi' as const, icon: Smartphone, label: 'UPI' },
                  { method: 'credit' as const, icon: CreditCard, label: 'Credit' },
                ].map(({ method, icon: Icon, label }) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                      paymentMethod === method
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${paymentMethod === method ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'credit' && (
              <div className="space-y-2">
                <Label htmlFor="customer">Customer Name</Label>
                <Input
                  id="customer"
                  value={creditCustomer}
                  onChange={(e) => setCreditCustomer(e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCheckoutOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleProceedToConfirm}>
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center py-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-4xl font-bold text-primary">₹{cartTotal}</p>
            </div>

            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Order Summary</p>
              {cart.map((cartItem) => (
                <div key={cartItem.item.id} className="flex justify-between text-sm">
                  <span>{cartItem.item.name} × {cartItem.qty}</span>
                  <span className="font-medium">₹{cartItem.item.price * cartItem.qty}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <span className="font-medium capitalize flex items-center gap-2">
                {paymentMethod === 'cash' && <Banknote className="w-4 h-4" />}
                {paymentMethod === 'upi' && <Smartphone className="w-4 h-4" />}
                {paymentMethod === 'credit' && <CreditCard className="w-4 h-4" />}
                {paymentMethod}
              </span>
            </div>

            {paymentMethod === 'credit' && creditCustomer && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Customer Name</span>
                <span className="font-medium">{creditCustomer}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => {
                setConfirmOpen(false);
                setCheckoutOpen(true);
              }} disabled={isSubmitting}>
                Back
              </Button>
              <Button className="flex-1" onClick={confirmSale} disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Confirm Sale'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600">Successfully Submitted!</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Token Number in big square */}
            <div className="flex justify-center">
              <div className="w-32 h-32 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-4xl font-bold shadow-lg">
                {completedSale?.tokenNumber}
              </div>
            </div>

            {/* Order Items */}
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Ordered Items</p>
              {completedSale?.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{item.itemName} × {item.qty}</span>
                  <span className="font-medium">₹{item.price * item.qty}</span>
                </div>
              ))}
            </div>

            {/* Close Button */}
            <Button className="w-full" onClick={() => setSuccessOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
