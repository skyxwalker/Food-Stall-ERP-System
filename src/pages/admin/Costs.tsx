import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, Plus, Pencil, Trash2, AlertCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { CostEntry, CostType } from '@/types';
import { toast } from '@/hooks/use-toast';

export default function Costs() {
  const { items, sales, costEntries, addCostEntry, updateCostEntry, deleteCostEntry } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CostEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [costType, setCostType] = useState<CostType>('individual');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [totalCost, setTotalCost] = useState('');
  const [description, setDescription] = useState('');
  const [commonName, setCommonName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate total costs and revenue
  const totalCostAmount = costEntries.reduce((sum, e) => sum + e.totalCost, 0);
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProfit = totalRevenue - totalCostAmount;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Get items that are already in a combined cost entry
  const itemsInCombinedCosts = useMemo(() => {
    const itemIds = new Set<string>();
    costEntries
      .filter(e => e.costType === 'combined')
      .forEach(e => e.itemIds.forEach(id => itemIds.add(id)));
    return itemIds;
  }, [costEntries]);

  // Get items that have individual costs
  const itemsWithIndividualCosts = useMemo(() => {
    const itemIds = new Set<string>();
    costEntries
      .filter(e => e.costType === 'individual')
      .forEach(e => e.itemIds.forEach(id => itemIds.add(id)));
    return itemIds;
  }, [costEntries]);

  // Find existing combined cost entry for items
  const findExistingCombinedEntry = (itemIds: string[]): CostEntry | null => {
    return costEntries.find(e => 
      e.costType === 'combined' && 
      itemIds.some(id => e.itemIds.includes(id))
    ) || null;
  };

  const resetForm = () => {
    setCostType('individual');
    setSelectedItemIds([]);
    setTotalCost('');
    setDescription('');
    setCommonName('');
    setEditingEntry(null);
    setValidationError(null);
  };

  const handleOpenDialog = (entry?: CostEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setCostType(entry.costType);
      setSelectedItemIds(entry.itemIds);
      setTotalCost(entry.totalCost.toString());
      setDescription(entry.description || '');
      setCommonName(entry.commonName || '');
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const validateCostEntry = (): boolean => {
    setValidationError(null);

    if (costType === 'general') {
      if (!commonName.trim()) {
        setValidationError('Please enter a name for this general cost.');
        return false;
      }
      return true;
    }

    if (selectedItemIds.length === 0) {
      setValidationError('Please select at least one item.');
      return false;
    }

    if (costType === 'combined') {
      if (selectedItemIds.length < 2) {
        setValidationError('Please select at least 2 items for a combined cost.');
        return false;
      }

      // Check if any selected items have individual costs (when creating new)
      if (!editingEntry) {
        const itemsWithCosts = selectedItemIds.filter(id => itemsWithIndividualCosts.has(id));
        if (itemsWithCosts.length > 0) {
          const names = itemsWithCosts.map(id => items.find(i => i.id === id)?.name).join(', ');
          setValidationError(`Cannot combine items that already have individual costs: ${names}. Delete those cost entries first.`);
          return false;
        }
      }

      if (!commonName.trim()) {
        setValidationError('Please enter a common name for combined costs.');
        return false;
      }
    }

    if (costType === 'individual') {
      if (selectedItemIds.length > 1) {
        setValidationError('Individual costs can only be for one item. Select "Combined" for multiple items.');
        return false;
      }

      const itemId = selectedItemIds[0];
      
      // Check if item is in a combined cost
      if (itemsInCombinedCosts.has(itemId) && !editingEntry) {
        const existingEntry = findExistingCombinedEntry([itemId]);
        if (existingEntry) {
          setValidationError(
            `This item is part of a combined cost "${existingEntry.commonName}". ` +
            `You can only add costs to the existing combined entry.`
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    if (!totalCost) return;
    if (!validateCostEntry()) return;

    const costValue = parseFloat(totalCost);
    if (isNaN(costValue) || costValue < 0) return;

    setIsSubmitting(true);
    
    try {
      // For individual costs on items that are in combined costs, add to the combined cost instead
      if (costType === 'individual' && selectedItemIds.length === 1) {
        const itemId = selectedItemIds[0];
        if (itemsInCombinedCosts.has(itemId) && !editingEntry) {
          const existingEntry = findExistingCombinedEntry([itemId]);
          if (existingEntry) {
            await updateCostEntry({
              ...existingEntry,
              totalCost: existingEntry.totalCost + costValue,
              description: existingEntry.description 
                ? `${existingEntry.description}, ${description || 'Added cost'}` 
                : description,
            });
            toast({
              title: 'Cost added to combined entry',
              description: `₹${costValue} added to "${existingEntry.commonName}"`,
            });
            setIsDialogOpen(false);
            resetForm();
            return;
          }
        }
      }

      if (editingEntry) {
        await updateCostEntry({
          ...editingEntry,
          itemIds: costType === 'general' ? [] : selectedItemIds,
          totalCost: costValue,
          description: description || undefined,
          commonName: (costType === 'combined' || costType === 'general') ? commonName : undefined,
          costType,
        });
      } else {
        await addCostEntry({
          itemIds: costType === 'general' ? [] : selectedItemIds,
          totalCost: costValue,
          description: description || undefined,
          commonName: (costType === 'combined' || costType === 'general') ? commonName : undefined,
          costType,
          date: new Date().toISOString(),
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this cost entry?')) {
      await deleteCostEntry(id);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setValidationError(null);
    setSelectedItemIds(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getItemNames = (itemIds: string[]) => {
    return itemIds
      .map(id => items.find(i => i.id === id)?.name || 'Unknown')
      .join(', ');
  };

  const getCostTypeBadge = (entry: CostEntry) => {
    switch (entry.costType) {
      case 'general':
        return <Badge variant="secondary" className="bg-info/20 text-info">General</Badge>;
      case 'combined':
        return <Badge variant="secondary" className="bg-primary/20 text-primary">Combined</Badge>;
      default:
        return <Badge variant="outline">Individual</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cost Management</h1>
          <p className="text-muted-foreground mt-1">Track ingredient and operational costs</p>
        </div>
        
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Cost Entry
        </Button>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEntry ? 'Edit Cost Entry' : 'Add Cost Entry'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {validationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Cost Type *</Label>
                <Select value={costType} onValueChange={(v) => {
                  setCostType(v as CostType);
                  setValidationError(null);
                  if (v === 'general') {
                    setSelectedItemIds([]);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual Item</SelectItem>
                    <SelectItem value="combined">Combined Items</SelectItem>
                    <SelectItem value="general">General Cost</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {costType === 'individual' && 'Cost for a single menu item'}
                  {costType === 'combined' && 'Shared cost across multiple items (e.g., shared ingredients)'}
                  {costType === 'general' && 'Operational costs not tied to items (e.g., plates, electricity)'}
                </p>
              </div>

              {costType !== 'general' && (
                <div className="space-y-2">
                  <Label>Select Item(s) *</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-background">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No items available. Add items first.
                      </p>
                    ) : (
                      items.map(item => {
                        const isSelected = selectedItemIds.includes(item.id);
                        const inCombined = itemsInCombinedCosts.has(item.id);
                        const hasIndividual = itemsWithIndividualCosts.has(item.id);
                        const isDisabled = costType === 'combined' && hasIndividual && !editingEntry;
                        
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                              isDisabled 
                                ? 'opacity-50 cursor-not-allowed bg-muted' 
                                : isSelected 
                                  ? 'bg-primary/10 border border-primary cursor-pointer' 
                                  : 'hover:bg-muted border border-transparent cursor-pointer'
                            }`}
                            onClick={() => !isDisabled && toggleItemSelection(item.id)}
                          >
                            <div 
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-sm text-muted-foreground ml-2">₹{item.price}</span>
                            </div>
                            <div className="flex gap-1">
                              {inCombined && <Badge variant="outline" className="text-xs">In Combined</Badge>}
                              {hasIndividual && <Badge variant="outline" className="text-xs">Has Cost</Badge>}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {costType === 'combined' && selectedItemIds.length > 1 && (
                    <p className="text-sm text-info">
                      ✓ This cost will be shared across {selectedItemIds.length} items
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="totalCost">Total Cost (₹) *</Label>
                <Input
                  id="totalCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="e.g., 1400"
                  required
                />
              </div>

              {(costType === 'combined' || costType === 'general') && (
                <div className="space-y-2">
                  <Label htmlFor="commonName">
                    {costType === 'general' ? 'Cost Name *' : 'Common Name for Report *'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {costType === 'general' 
                      ? 'Name to identify this cost in reports (e.g., "Plates & Glasses", "Electricity")'
                      : 'This name will be shown in reports instead of individual items'
                    }
                  </p>
                  <Input
                    id="commonName"
                    value={commonName}
                    onChange={(e) => setCommonName(e.target.value)}
                    placeholder={costType === 'general' ? 'e.g., Plates & Glasses' : 'e.g., Juice Ingredients'}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Lemon + Water + Ice + Glasses"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={
                    isSubmitting ||
                    !totalCost || 
                    (costType !== 'general' && selectedItemIds.length === 0) ||
                    ((costType === 'combined' || costType === 'general') && !commonName.trim())
                  }
                >
                  {isSubmitting ? 'Saving...' : editingEntry ? 'Update' : 'Add'} {!isSubmitting && 'Cost Entry'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-info rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-info-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">₹{totalCostAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-destructive rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-destructive-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ₹{totalProfit.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-success rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p className="text-2xl font-bold">{profitMargin}%</p>
              </div>
              <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost entries table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {costEntries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No cost entries yet.</p>
              <p className="text-sm mt-1">Click "Add Cost Entry" to track your costs.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Items / Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {getCostTypeBadge(entry)}
                    </TableCell>
                    <TableCell>
                      {entry.costType === 'general' ? (
                        <span className="font-medium">{entry.commonName}</span>
                      ) : entry.commonName && entry.itemIds.length > 1 ? (
                        <div>
                          <Badge variant="default" className="mb-1">{entry.commonName}</Badge>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.itemIds.map(itemId => {
                              const item = items.find(i => i.id === itemId);
                              return item ? (
                                <span key={itemId} className="text-xs text-muted-foreground">{item.name}</span>
                              ) : null;
                            }).filter(Boolean).reduce((acc: React.ReactNode[], curr, idx, arr) => {
                              if (idx < arr.length - 1) return [...acc, curr, ', '];
                              return [...acc, curr];
                            }, [])}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {entry.itemIds.map(itemId => {
                            const item = items.find(i => i.id === itemId);
                            return item ? (
                              <Badge key={itemId} variant="outline">{item.name}</Badge>
                            ) : (
                              <Badge key={itemId} variant="secondary">Unknown</Badge>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ₹{entry.totalCost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(entry)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Help section */}
      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">How Cost Tracking Works</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <strong>Individual:</strong> Cost for a single menu item (e.g., ingredients for Burger).</li>
            <li>• <strong>Combined:</strong> Shared cost for multiple items that use same ingredients. Items with individual costs cannot be combined.</li>
            <li>• <strong>General:</strong> Operational costs not tied to items (plates, electricity, rent). Shows separately in reports.</li>
            <li>• The system automatically calculates profit based on revenue and assigned costs.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
