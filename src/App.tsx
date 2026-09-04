import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  // Auto-initialize demo data on first visit if repository is empty
  useEffect(() => {
    if (!DataRepository.hasData()) {
      DataRepository.loadDemoData();
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/sales" element={<SalesAnalyticsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/stores" element={<StoresPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/import" element={<DataImportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
