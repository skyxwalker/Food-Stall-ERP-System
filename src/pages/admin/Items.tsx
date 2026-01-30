import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Item, StockType, Employee } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Package, Infinity } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import * as supabaseStorage from '@/lib/supabaseStorage';

export default function Items() {
  const { items, addItem, updateItem, deleteItem } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stockType, setStockType] = useState<StockType>('fixed');
  const [stockQty, setStockQty] = useState('');
  const [assignedEmployeeId, setAssignedEmployeeId] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');

  // Load employees on mount
  useEffect(() => {
    const loadEmployees = async () => {
      const data = await supabaseStorage.getEmployees();
      setEmployees(data);
      if (data.length > 0 && !assignedEmployeeId) {
        setAssignedEmployeeId(data[0].id);
      }
    };
    loadEmployees();
  }, []);

  const resetForm = () => {
    setName('');
    setPrice('');
    setStockType('fixed');
    setStockQty('');
    setAssignedEmployeeId(employees.length > 0 ? employees[0].id : '');
    setCostPerUnit('');
    setEditingItem(null);
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price.toString());
    setStockType(item.stockType);
    setStockQty(item.stockQty.toString());
    setAssignedEmployeeId(item.assignedEmployeeId);
    setCostPerUnit(item.costPerUnit.toString());
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const itemData = {
      name: name.trim(),
      price: parseFloat(price),
      stockType,
      stockQty: stockType === 'unlimited' ? 9999 : parseInt(stockQty),
      assignedEmployeeId: assignedEmployeeId,
      costPerUnit: parseFloat(costPerUnit) || 0,
    };

    try {
      if (editingItem) {
        await updateItem({ ...itemData, id: editingItem.id });
        toast.success('Item updated successfully');
      } else {
        await addItem(itemData);
        toast.success('Item added successfully');
      }

      setDialogOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteItem(id);
      toast.success('Item deleted');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Item Management</h1>
          <p className="text-muted-foreground mt-1">Manage your menu items and inventory</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2" disabled={isSubmitting}>
              <Plus className="w-5 h-5" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Samosa"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Selling Price (₹)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost Price (₹)</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stock Type</Label>
                <Select value={stockType} onValueChange={(v) => setStockType(v as StockType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed (Limited Stock)</SelectItem>
                    <SelectItem value="unlimited">Unlimited (Drinks, etc.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {stockType === 'fixed' && (
                <div className="space-y-2">
                  <Label htmlFor="qty">Stock Quantity</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="0"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    placeholder="100"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Assigned Employee</Label>
                <Select value={assignedEmployeeId} onValueChange={setAssignedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.username} ({emp.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {isSubmitting ? 'Saving...' : `${editingItem ? 'Update' : 'Add'} Item`}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No items yet</h3>
            <p className="text-muted-foreground mb-4">Add your first menu item to get started</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Menu Items ({items.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>₹{item.price}</TableCell>
                    <TableCell>₹{item.costPerUnit}</TableCell>
                    <TableCell className="text-success font-medium">
                      ₹{(item.price - item.costPerUnit).toFixed(0)}
                    </TableCell>
                    <TableCell>
                      {item.stockType === 'unlimited' ? (
                        <Badge variant="secondary" className="gap-1">
                          <Infinity className="w-3 h-3" />
                          Unlimited
                        </Badge>
                      ) : (
                        <Badge
                          variant={item.stockQty < 10 ? 'destructive' : 'outline'}
                        >
                          {item.stockQty} units
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const emp = employees.find(e => e.id === item.assignedEmployeeId);
                        return (
                          <Badge variant="outline">
                            {emp ? emp.username : item.assignedEmployeeId.slice(0, 8)}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
