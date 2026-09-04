// Core Domain Types for NEXUS RetailIQ

export type UserRole = 'manager' | 'admin';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  managerId: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type ProductCategory =
  | 'Dairy'
  | 'Beverages'
  | 'Snacks'
  | 'Grocery'
  | 'Personal Care'
  | 'Household'
  | 'Electronics'
  | 'Stationery';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  sku: string;
  sellingPrice: number;
  costPrice: number;
  supplier: string;
  leadTimeDays: number;
  safetyStock: number;
  reorderQuantity: number;
  status: 'active' | 'discontinued';
  createdAt: string;
}

export interface Sale {
  id: string;
  date: string; // YYYY-MM-DD
  storeId: string;
  productId: string;
  quantity: number;
  revenue: number;
  unitPrice: number;
  createdAt: string;
}

export interface InventoryRecord {
  id: string;
  date: string; // YYYY-MM-DD
  storeId: string;
  productId: string;
  quantity: number;
  updatedAt: string;
}

export type AlertType =
  | 'STOCK_OUT'
  | 'LOW_STOCK'
  | 'OVERSTOCK'
  | 'SLOW_MOVING'
  | 'SALES_SPIKE'
  | 'SALES_DROP';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  storeId: string;
  productId: string;
  title: string;
  description: string;
  metrics: {
    currentStock?: number;
    avgDailySales?: number;
    daysRemaining?: number;
    reorderPoint?: number;
    currentSales?: number;
    baselineSales?: number;
    percentageChange?: number;
    holdingValue?: number;
    targetStock?: number;
  };
  recommendation: string;
  assumptions: string[];
  status: 'active' | 'reviewed' | 'dismissed';
  createdAt: string;
}

export interface RecommendationAction {
  id: string;
  category: 'REORDER' | 'REDUCE_INVENTORY' | 'INVESTIGATE_SPIKE' | 'INVESTIGATE_DROP' | 'MOVE_INVENTORY' | 'PAUSE_REORDER';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  storeId: string;
  productId: string;
  problem: string;
  evidence: string;
  action: string;
  expectedPurpose: string;
  assumptions: string[];
  metrics: Record<string, number | string>;
  createdAt: string;
}

export interface WhyExplanation {
  title: string;
  productName?: string;
  storeName?: string;
  dataUsed: {
    label: string;
    value: string | number;
    source: string;
  }[];
  calculationSteps: {
    step: string;
    formula: string;
    result: string;
  }[];
  threshold: string;
  assumptions: string[];
  finalVerdict: string;
  recommendedAction: string;
}

export type CopilotIntent =
  | 'DASHBOARD_SUMMARY'
  | 'STOCK_OUT'
  | 'LOW_STOCK'
  | 'OVERSTOCK'
  | 'SLOW_MOVING'
  | 'REORDER'
  | 'PRODUCT_PERFORMANCE'
  | 'STORE_PERFORMANCE'
  | 'SALES_TREND'
  | 'SALES_SPIKE'
  | 'SALES_DROP'
  | 'TOP_PRODUCTS'
  | 'CATEGORY_ANALYSIS'
  | 'GENERAL_ANALYTICS'
  | 'INSUFFICIENT_DATA';

export interface CopilotMetric {
  label: string;
  value: number | string;
  unit?: string;
  context?: string;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  timestamp: string;
  content: string;
  intent?: CopilotIntent;
  numbers?: CopilotMetric[];
  evidence?: string;
  recommendation?: string;
  assumptions?: string[];
  confidence: 'HIGH' | 'LIMITED' | 'INSUFFICIENT_DATA';
  dataAvailable: boolean;
  explanation?: WhyExplanation;
  rawJson?: unknown;
}

export interface DashboardKPIs {
  todayRevenue: number;
  revenueChangePct: number;
  todayUnits: number;
  unitsChangePct: number;
  lowStockItemsCount: number;
  lowStockChangePct: number;
  stockoutRisksCount: number;
  stockoutChangePct: number;
  slowMoversCount: number;
  activeAlertsCount: number;
  totalInventoryValue: number;
}
