import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { QueryProvider } from './presentation/contexts/QueryClientContext';
import { AuthProvider, useAuth } from './presentation/contexts/AuthContext';
import { ClientProvider } from './presentation/contexts/ClientContext';
import { SidebarProvider } from './presentation/contexts/SidebarContext';
import { MainLayout } from './presentation/components/layout/MainLayout';
import { LoginPage } from './presentation/pages/login/LoginPage';
import { Dashboard } from './presentation/pages/dashboard/Dashboard';
import { PlannerPage } from './presentation/pages/planner/PlannerPage';
import { TreasuryPage } from './presentation/pages/treasury/TreasuryPage';
import { ClientsPage } from './presentation/pages/clients/ClientsPage';
import { SuppliersPage } from './presentation/pages/suppliers/SuppliersPage';
import { IngredientsPage } from './presentation/pages/ingredients/IngredientsPage';
import { PurchasesPage } from './presentation/pages/purchases/PurchasesPage';
import { InventoryPage } from './presentation/pages/inventory/InventoryPage';
import { ReportsPage } from './presentation/pages/reports/ReportsPage';
import { CarteleraPage } from './presentation/pages/cartelera/CarteleraPage';

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="treasury" element={<TreasuryPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="ingredients" element={<IngredientsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="cartelera" element={<CarteleraPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <ClientProvider>
          <SidebarProvider>
            <BrowserRouter>
              <Toaster position="top-right" />
              <AppRoutes />
            </BrowserRouter>
          </SidebarProvider>
        </ClientProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
