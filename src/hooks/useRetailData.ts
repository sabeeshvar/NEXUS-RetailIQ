import { useState, useEffect, useMemo, useCallback } from 'react';
import { DataRepository } from '../services/dataRepository';
import { AnalyticsEngine, ProductMetricSummary } from '../lib/analytics/engine';
import { Store, Product, Sale, InventoryRecord, Alert, DashboardKPIs } from '../types';

export function useRetailData() {
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasData, setHasData] = useState<boolean>(false);

  const refreshData = useCallback(() => {
    const s = DataRepository.getStores();
    const p = DataRepository.getProducts();
    const sl = DataRepository.getSales();
    const inv = DataRepository.getInventory();

    setStores(s);
    setProducts(p);
    setSales(sl);
    setInventory(inv);
    setHasData(p.length > 0);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
    const unsubscribe = DataRepository.subscribe(() => {
      refreshData();
    });
    return unsubscribe;
  }, [refreshData]);

  const loadDemo = useCallback(async () => {
    setIsLoading(true);
    await DataRepository.loadDemoData();
    refreshData();
  }, [refreshData]);

  const clearAll = useCallback(() => {
    DataRepository.clearData();
    refreshData();
  }, [refreshData]);

  // Compute scoped analytics
  const summaries: ProductMetricSummary[] = useMemo(() => {
    if (!products.length) return [];
    return AnalyticsEngine.computeProductSummaries(
      products,
      inventory,
      sales,
      selectedStoreId !== 'all' ? selectedStoreId : undefined
    );
  }, [products, inventory, sales, selectedStoreId]);

  const anomalies = useMemo(() => {
    if (!products.length) return { spikes: [], drops: [] };
    return AnalyticsEngine.detectSalesAnomalies(
      products,
      sales,
      selectedStoreId !== 'all' ? selectedStoreId : undefined
    );
  }, [products, sales, selectedStoreId]);

  const alerts: Alert[] = useMemo(() => {
    if (!products.length) return [];
    return AnalyticsEngine.generateAlerts(
      products,
      inventory,
      sales,
      selectedStoreId !== 'all' ? selectedStoreId : undefined
    );
  }, [products, inventory, sales, selectedStoreId]);

  const kpis: DashboardKPIs = useMemo(() => {
    if (!products.length) {
      return {
        todayRevenue: 0,
        revenueChangePct: 0,
        todayUnits: 0,
        unitsChangePct: 0,
        lowStockItemsCount: 0,
        lowStockChangePct: 0,
        stockoutRisksCount: 0,
        stockoutChangePct: 0,
        slowMoversCount: 0,
        activeAlertsCount: 0,
        totalInventoryValue: 0,
      };
    }
    return AnalyticsEngine.computeDashboardKPIs(
      products,
      inventory,
      sales,
      selectedStoreId !== 'all' ? selectedStoreId : undefined
    );
  }, [products, inventory, sales, selectedStoreId]);

  return {
    stores,
    products,
    sales,
    inventory,
    selectedStoreId,
    setSelectedStoreId,
    summaries,
    anomalies,
    alerts,
    kpis,
    hasData,
    isLoading,
    loadDemo,
    clearAll,
    refreshData,
  };
}
