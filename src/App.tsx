import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ServiceRequestsPage } from './pages/ServiceRequestsPage';
import { ServiceRequestDetailPage } from './pages/ServiceRequestDetailPage';
import { OperatorsPage } from './pages/OperatorsPage';
import { OperatorProfilePage } from './pages/OperatorProfilePage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerProfilePage } from './pages/CustomerProfilePage';
import { LocationsPage } from './pages/LocationsPage';
import { MapPage } from './pages/MapPage';
import { FinancePage } from './pages/FinancePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-[#F7F6F0] flex items-center justify-center p-4">
        <div className="flex items-center gap-2.5 text-sm text-[#202A24]">
          <Loader2 className="w-4 h-4 animate-spin text-[#123C2A]" />
          <span>Verifying staff access...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppProvider>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      <Route path="/requests" element={<ServiceRequestsPage />} />
                      <Route path="/requests/:id" element={<ServiceRequestDetailPage />} />
                      <Route path="/operators" element={<OperatorsPage />} />
                      <Route path="/operators/:id" element={<OperatorProfilePage />} />
                      <Route path="/customers" element={<CustomersPage />} />
                      <Route path="/customers/:id" element={<CustomerProfilePage />} />
                      <Route path="/locations" element={<LocationsPage />} />
                      <Route path="/map" element={<MapPage />} />
                      <Route path="/finance" element={<FinancePage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AppShell>
                </AppProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
