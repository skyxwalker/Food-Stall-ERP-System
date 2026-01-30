import { useState, useEffect } from 'react';
import { Employee, ConfirmationMode } from '@/types';
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
import { Plus, Pencil, Trash2, Users, Zap, Hand } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import * as supabaseStorage from '@/lib/supabaseStorage';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [confirmationMode, setConfirmationMode] = useState<ConfirmationMode>('manual');

  const loadEmployees = async () => {
    setIsLoading(true);
    const data = await supabaseStorage.getEmployees();
    setEmployees(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEmployeeCode('');
    setConfirmationMode('manual');
    setEditingEmployee(null);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setUsername(employee.username);
    setPassword(''); // Don't show existing password
    setEmployeeCode(employee.employeeCode);
    setConfirmationMode(employee.confirmationMode);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEmployee) {
      const success = await supabaseStorage.updateEmployee({
        id: editingEmployee.id,
        username: username.trim(),
        password: password || undefined, // Only update if provided
        employeeCode: employeeCode.trim(),
        confirmationMode,
      });
      if (success) {
        toast.success('Employee updated successfully');
        await loadEmployees();
      } else {
        toast.error('Failed to update employee');
      }
    } else {
      const result = await supabaseStorage.addEmployee({
        username: username.trim(),
        password: password.trim(),
        employeeCode: employeeCode.trim(),
        confirmationMode,
      });
      if (result) {
        toast.success('Employee added successfully');
        await loadEmployees();
      } else {
        toast.error('Failed to add employee');
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this employee?')) {
      const success = await supabaseStorage.deleteEmployee(id);
      if (success) {
        toast.success('Employee deleted');
        await loadEmployees();
      } else {
        toast.error('Failed to delete employee');
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground mt-1">Manage your staff and their confirmation modes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., john_doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingEmployee ? 'New Password (leave blank to keep current)' : 'Password'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required={!editingEmployee}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeCode">Employee Code</Label>
                <Input
                  id="employeeCode"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  placeholder="e.g., EMP001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Confirmation Mode</Label>
                <Select value={confirmationMode} onValueChange={(v) => setConfirmationMode(v as ConfirmationMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Hand className="w-4 h-4" />
                        <span>Manual Confirmation</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="auto">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span>Auto Confirmation</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {confirmationMode === 'manual'
                    ? 'Employee must manually confirm each order from their dashboard'
                    : 'Orders are automatically marked as completed'}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Loading employees...</p>
          </CardContent>
        </Card>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No employees yet</h3>
            <p className="text-muted-foreground mb-4">Add your first employee to get started</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Employees ({employees.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Confirmation Mode</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.employeeCode}</Badge>
                    </TableCell>
                    <TableCell>
                      {employee.confirmationMode === 'auto' ? (
                        <Badge className="gap-1 bg-success/20 text-success hover:bg-success/30">
                          <Zap className="w-3 h-3" />
                          Auto
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Hand className="w-3 h-3" />
                          Manual
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(employee)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(employee.id)}
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
