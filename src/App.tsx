import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider, useData } from "@/contexts/DataContext";
import { Loader2 } from "lucide-react";

import Login from "@/pages/Login";
import AdminLayout from "@/components/layout/AdminLayout";
import EmployeeLayout from "@/components/layout/EmployeeLayout";
import ServerLayout from "@/components/layout/ServerLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Items from "@/pages/admin/Items";
import Employees from "@/pages/admin/Employees";
import POS from "@/pages/admin/POS";
import Costs from "@/pages/admin/Costs";
import Reports from "@/pages/admin/Reports";
import TaskDashboard from "@/pages/employee/TaskDashboard";
import ServerDashboard from "@/pages/server/ServerDashboard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'admin' | 'employee' | 'server' }) {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: dataLoading } = useData();
  
  if (authLoading || dataLoading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={
      user.role === 'admin' ? '/admin' :
      user.role === 'employee' ? '/employee' :
      '/server'
    } replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={
        user.role === 'admin' ? '/admin' :
        user.role === 'employee' ? '/employee' :
        '/server'
      } replace /> : <Login />} />
      
      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/items" element={<ProtectedRoute requiredRole="admin"><AdminLayout><Items /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/employees" element={<ProtectedRoute requiredRole="admin"><AdminLayout><Employees /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/pos" element={<ProtectedRoute requiredRole="admin"><AdminLayout><POS /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/costs" element={<ProtectedRoute requiredRole="admin"><AdminLayout><Costs /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><AdminLayout><Reports /></AdminLayout></ProtectedRoute>} />
      
      {/* Employee routes */}
      <Route path="/employee" element={<ProtectedRoute requiredRole="employee"><EmployeeLayout><TaskDashboard /></EmployeeLayout></ProtectedRoute>} />
      
      {/* Server routes */}
      <Route path="/server" element={<ProtectedRoute requiredRole="server"><ServerLayout><ServerDashboard /></ServerLayout></ProtectedRoute>} />
      
      {/* Redirects */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
