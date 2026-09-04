import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CopilotPage } from './pages/CopilotPage';
import { SalesAnalyticsPage } from './pages/SalesAnalyticsPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProductsPage } from './pages/ProductsPage';
import { StoresPage } from './pages/StoresPage';
import { AlertsPage } from './pages/AlertsPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { DataImportPage } from './pages/DataImportPage';
import { SettingsPage } from './pages/SettingsPage';
import { DataRepository } from './services/dataRepository';

export const App: React.FC = () => {
  // Synchronize with Cloud Firestore or initialize demo data
  useEffect(() => {
    const initData = async () => {
      try {
        const fetched = await DataRepository.fetchFromFirestore();
        if (!fetched && !DataRepository.hasData()) {
          await DataRepository.loadDemoData();
        }
      } catch (err) {
        console.warn('[App] Data init fallback:', err);
      }
    };
    initData();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/copilot" element={<CopilotPage />} />
              <Route path="/sales" element={<SalesAnalyticsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/stores" element={<StoresPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/import-data" element={<DataImportPage />} />
              <Route path="/import" element={<Navigate to="/import-data" replace />} />
              <Route path="/data-import" element={<Navigate to="/import-data" replace />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
