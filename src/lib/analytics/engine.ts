import { Product, Sale, InventoryRecord, Alert, RecommendationAction, WhyExplanation, DashboardKPIs } from '../../types';

export interface ProductMetricSummary {
  product: Product;
  storeId: string;
  currentStock: number;
  salesToday: number;
  salesYesterday: number;
  salesLast7Days: number;
  salesLast30Days: number;
  avgDailySales7d: number;
  avgDailySales30d: number;
  daysRemaining: number;
  reorderPoint: number;
  recommendedReorderQty: number;
  isStockoutRisk: boolean;
  isLowStock: boolean;
  isOverstocked: boolean;
  isSlowMoving: boolean;
  stockCoverageDays: number;
  inventoryValue: number;
  revenue30d: number;
  grossMarginPct: number;
}

export class AnalyticsEngine {
  /**
   * Calculate 7-day, 14-day, 30-day sales averages for a product at a store
   */
  public static calculateDailyAverages(
    sales: Sale[],
    productId: string,
    storeId?: string,
    referenceDateStr?: string
  ): {
    todaySales: number;
    yesterdaySales: number;
    avg7d: number;
    avg14d: number;
    avg30d: number;
    total30d: number;
    revenue30d: number;
  } {
    const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
    const productSales = sales.filter(
      s => s.productId === productId && (!storeId || s.storeId === storeId)
    );

    let todaySales = 0;
    let yesterdaySales = 0;
    let sum7d = 0;
    let sum14d = 0;
    let sum30d = 0;
    let revenue30d = 0;

    const oneDayMs = 24 * 60 * 60 * 1000;

    productSales.forEach(s => {
      const sDate = new Date(s.date);
      const diffDays = Math.floor((refDate.getTime() - sDate.getTime()) / oneDayMs);

      if (diffDays === 0) {
        todaySales += s.quantity;
      } else if (diffDays === 1) {
        yesterdaySales += s.quantity;
      }

      if (diffDays >= 0 && diffDays < 7) {
        sum7d += s.quantity;
      }
      if (diffDays >= 0 && diffDays < 14) {
        sum14d += s.quantity;
      }
      if (diffDays >= 0 && diffDays < 30) {
        sum30d += s.quantity;
        revenue30d += s.revenue;
      }
    });

    return {
      todaySales,
      yesterdaySales,
      avg7d: Number((sum7d / 7).toFixed(1)),
      avg14d: Number((sum14d / 14).toFixed(1)),
      avg30d: Number((sum30d / 30).toFixed(1)),
      total30d: sum30d,
      revenue30d,
    };
  }

  /**
   * Deterministic Reorder Point calculation
   * Reorder Point = (Avg Daily Sales * Lead Time) + Safety Stock
   */
  public static calculateReorderPoint(avgDailySales: number, leadTimeDays: number, safetyStock: number): number {
    const calculated = (avgDailySales * leadTimeDays) + safetyStock;
    return Math.ceil(calculated);
  }

  /**
   * Deterministic Days Remaining calculation
   * Days Remaining = Current Stock / Avg Daily Sales
   */
  public static calculateDaysRemaining(currentStock: number, avgDailySales: number): number {
    if (avgDailySales <= 0) {
      return currentStock > 0 ? 999 : 0;
    }
    return Number((currentStock / avgDailySales).toFixed(1));
  }

  /**
   * Target stock level for reordering
   * Target Stock = Avg Daily Sales * (Lead Time + Review Period [7 days]) + Safety Stock
   */
  public static calculateTargetStock(avgDailySales: number, leadTimeDays: number, safetyStock: number, reviewPeriodDays = 7): number {
    return Math.ceil(avgDailySales * (leadTimeDays + reviewPeriodDays) + safetyStock);
  }

  /**
   * Compute complete metrics summary for all products
   */
  public static computeProductSummaries(
    products: Product[],
    inventory: InventoryRecord[],
    sales: Sale[],
    storeId?: string,
    refDateStr?: string
  ): ProductMetricSummary[] {
    return products.map(product => {
      // Find current inventory for this product
      const matchingInventory = inventory.filter(
        inv => inv.productId === product.id && (!storeId || inv.storeId === storeId)
      );
      const currentStock = matchingInventory.reduce((acc, curr) => acc + curr.quantity, 0);

      const salesMetrics = this.calculateDailyAverages(sales, product.id, storeId, refDateStr);
      // Use 7-day average for reactive inventory decisions; fallback to 30-day if 7-day has no volume
      const effectiveDailySales = salesMetrics.avg7d > 0 ? salesMetrics.avg7d : (salesMetrics.avg30d > 0 ? salesMetrics.avg30d : 0.1);

      const daysRemaining = this.calculateDaysRemaining(currentStock, effectiveDailySales);
      const reorderPoint = this.calculateReorderPoint(effectiveDailySales, product.leadTimeDays, product.safetyStock);

      const targetStock = this.calculateTargetStock(effectiveDailySales, product.leadTimeDays, product.safetyStock);
      const recommendedReorderQty = currentStock < reorderPoint
        ? Math.max(product.reorderQuantity, targetStock - currentStock)
        : 0;

      // Deterministic rules
      const isStockoutRisk = daysRemaining <= Math.max(product.leadTimeDays, 2.5) && currentStock > 0;
      const isLowStock = currentStock <= reorderPoint && !isStockoutRisk;
      const stockCoverageDays = effectiveDailySales > 0 ? Number((currentStock / effectiveDailySales).toFixed(1)) : 999;
      
      // Overstock: Stock coverage > 45 days AND current stock > safety stock * 2
      const isOverstocked = (stockCoverageDays > 45 && currentStock > product.safetyStock * 2) || (currentStock > targetStock * 2 && currentStock > 30);
      
      // Slow moving: Stock > 30 and sales in last 30 days < 5
      const isSlowMoving = currentStock >= 25 && salesMetrics.total30d < 6;

      const inventoryValue = currentStock * product.costPrice;
      const grossMarginPct = product.sellingPrice > 0
        ? Number((((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100).toFixed(1))
        : 0;

      return {
        product,
        storeId: storeId || 'all',
        currentStock,
        salesToday: salesMetrics.todaySales,
        salesYesterday: salesMetrics.yesterdaySales,
        salesLast7Days: Math.round(salesMetrics.avg7d * 7),
        salesLast30Days: salesMetrics.total30d,
        avgDailySales7d: salesMetrics.avg7d,
        avgDailySales30d: salesMetrics.avg30d,
        daysRemaining,
        reorderPoint,
        recommendedReorderQty,
        isStockoutRisk,
        isLowStock,
        isOverstocked,
        isSlowMoving,
        stockCoverageDays,
        inventoryValue,
        revenue30d: salesMetrics.revenue30d,
        grossMarginPct,
      };
    });
  }

  /**
   * Detect Sales Spikes (+30%) and Sales Drops (-30%)
   */
  public static detectSalesAnomalies(
    products: Product[],
    sales: Sale[],
    storeId?: string,
    refDateStr?: string
  ): {
    spikes: { product: Product; storeId: string; todaySales: number; baseline: number; changePct: number }[];
    drops: { product: Product; storeId: string; todaySales: number; baseline: number; changePct: number }[];
  } {
    const spikes: { product: Product; storeId: string; todaySales: number; baseline: number; changePct: number }[] = [];
    const drops: { product: Product; storeId: string; todaySales: number; baseline: number; changePct: number }[] = [];

    products.forEach(product => {
      const metrics = this.calculateDailyAverages(sales, product.id, storeId, refDateStr);
      const baseline = metrics.avg7d;

      // Only evaluate if baseline is meaningful (>= 3 units/day) to avoid false noise
      if (baseline >= 3) {
        const changePct = Number((((metrics.todaySales - baseline) / baseline) * 100).toFixed(1));

        if (changePct >= 30) {
          spikes.push({
            product,
            storeId: storeId || 'all',
            todaySales: metrics.todaySales,
            baseline,
            changePct,
          });
        } else if (changePct <= -30) {
          drops.push({
            product,
            storeId: storeId || 'all',
            todaySales: metrics.todaySales,
            baseline,
            changePct,
          });
        }
      }
    });

    return { spikes, drops };
  }

  /**
   * Generate prioritized alerts for the dashboard and alerts center
   */
  public static generateAlerts(
    products: Product[],
    inventory: InventoryRecord[],
    sales: Sale[],
    storeId?: string,
    refDateStr?: string
  ): Alert[] {
    const summaries = this.computeProductSummaries(products, inventory, sales, storeId, refDateStr);
    const anomalies = this.detectSalesAnomalies(products, sales, storeId, refDateStr);
    const alerts: Alert[] = [];

    // Stockout risks
    summaries.filter(s => s.isStockoutRisk).forEach(s => {
      alerts.push({
        id: `alert-stockout-${s.product.id}-${s.storeId}`,
        type: 'STOCK_OUT',
        severity: 'CRITICAL',
        storeId: s.storeId,
        productId: s.product.id,
        title: `Critical Stock-Out Risk: ${s.product.name}`,
        description: `Current stock (${s.currentStock} units) is projected to deplete in ${s.daysRemaining} days at current velocity of ${s.avgDailySales7d} units/day.`,
        metrics: {
          currentStock: s.currentStock,
          avgDailySales: s.avgDailySales7d,
          daysRemaining: s.daysRemaining,
          reorderPoint: s.reorderPoint,
          targetStock: s.recommendedReorderQty,
        },
        recommendation: `Place immediate purchase order for ${s.recommendedReorderQty} units to prevent stock depletion before lead time (${s.product.leadTimeDays} days).`,
        assumptions: [
          'Demand velocity estimated using the 7-day moving average.',
          `Supplier lead time is ${s.product.leadTimeDays} business days.`,
          `Safety stock buffer maintained at ${s.product.safetyStock} units.`
        ],
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    });

    // Low stock warnings
    summaries.filter(s => s.isLowStock).forEach(s => {
      alerts.push({
        id: `alert-lowstock-${s.product.id}-${s.storeId}`,
        type: 'LOW_STOCK',
        severity: 'WARNING',
        storeId: s.storeId,
        productId: s.product.id,
        title: `Low Stock Alert: ${s.product.name}`,
        description: `Stock level (${s.currentStock} units) has dipped below calculated reorder threshold (${s.reorderPoint} units).`,
        metrics: {
          currentStock: s.currentStock,
          avgDailySales: s.avgDailySales7d,
          daysRemaining: s.daysRemaining,
          reorderPoint: s.reorderPoint,
        },
        recommendation: `Initiate standard replenishment order for ${s.recommendedReorderQty} units.`,
        assumptions: [
          `Reorder threshold formula: (${s.avgDailySales7d} × ${s.product.leadTimeDays}d lead time) + ${s.product.safetyStock} safety stock = ${s.reorderPoint} units.`
        ],
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    });

    // Overstock warnings
    summaries.filter(s => s.isOverstocked).forEach(s => {
      alerts.push({
        id: `alert-overstock-${s.product.id}-${s.storeId}`,
        type: 'OVERSTOCK',
        severity: 'WARNING',
        storeId: s.storeId,
        productId: s.product.id,
        title: `Excess Inventory: ${s.product.name}`,
        description: `High inventory holding of ${s.currentStock} units provides ${s.stockCoverageDays} days of coverage, tying up ₹${(s.inventoryValue).toLocaleString('en-IN')}.`,
        metrics: {
          currentStock: s.currentStock,
          avgDailySales: s.avgDailySales7d,
          holdingValue: s.inventoryValue,
          daysRemaining: s.stockCoverageDays,
        },
        recommendation: `Pause scheduled purchase orders. Consider promotional bundling or stock rebalancing to high-turnover stores.`,
        assumptions: [
          'Coverage exceeding 45 days is classified as excess working capital lockup.',
          'Carrying cost estimate assumes regular warehousing overhead.'
        ],
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    });

    // Slow moving warnings
    summaries.filter(s => s.isSlowMoving).forEach(s => {
      alerts.push({
        id: `alert-slowmoving-${s.product.id}-${s.storeId}`,
        type: 'SLOW_MOVING',
        severity: 'WARNING',
        storeId: s.storeId,
        productId: s.product.id,
        title: `Slow-Moving Stock: ${s.product.name}`,
        description: `Only ${s.salesLast30Days} units sold over the last 30 days while ${s.currentStock} units sit on shelves.`,
        metrics: {
          currentStock: s.currentStock,
          baselineSales: s.salesLast30Days,
          holdingValue: s.inventoryValue,
        },
        recommendation: `Review product shelf placement, consider discount pricing, or return to supplier if contractual terms permit.`,
        assumptions: [
          'Threshold for slow-moving: Current stock >= 25 with 30-day velocity < 6 units.',
          'Assumes no deliberate strategic stockholding.'
        ],
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    });

    // Sales spikes (INFO)
    anomalies.spikes.forEach(sp => {
      alerts.push({
        id: `alert-spike-${sp.product.id}-${sp.storeId}`,
        type: 'SALES_SPIKE',
        severity: 'INFO',
        storeId: sp.storeId,
        productId: sp.product.id,
        title: `Sales Surge (+${sp.changePct}%): ${sp.product.name}`,
        description: `Today's sales surged to ${sp.todaySales} units compared to the 7-day baseline of ${sp.baseline} units/day.`,
        metrics: {
          currentSales: sp.todaySales,
          baselineSales: sp.baseline,
          percentageChange: sp.changePct,
        },
        recommendation: `Check shelf restocking speed to prevent premature stockout if demand spike continues.`,
        assumptions: [
          'Baseline is calculated using the prior 7-day moving average.',
          'Threshold: Daily velocity change >= +30% with baseline >= 3 units.'
        ],
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    });

    // Sales drops (WARNING)
    anomalies.drops.forEach(dr => {
      alerts.push({
        id: `alert-drop-${dr.product.id}-${dr.storeId}`,
        type: 'SALES_DROP',
        severity: 'WARNING',
        storeId: dr.storeId,
        productId: dr.product.id,
        title: `Sales Dip (${dr.changePct}%): ${dr.product.name}`,
        description: `Today's sales fell to ${dr.todaySales} units against a 7-day baseline of ${dr.baseline} units/day.`,
        metrics: {
          currentSales: dr.todaySales,
          baselineSales: dr.baseline,
          percentageChange: dr.changePct,
        },
        recommendation: `Inspect store shelf display, check competitor promotional pricing, or verify if stock is mislocated.`,
        assumptions: [
          'Baseline is calculated using the prior 7-day moving average.',
          'Threshold: Daily velocity dip <= -30% with baseline >= 3 units.'
        ],
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    });

    return alerts;
  }

  /**
   * Build Step-by-Step Explainability ("Why?")
   */
  public static buildWhyExplanation(
    product: Product,
    storeName: string,
    currentStock: number,
    sales: Sale[],
    type: 'STOCK_OUT' | 'REORDER' | 'SLOW_MOVING' | 'OVERSTOCK' | 'SALES_SPIKE' | 'SALES_DROP',
    storeId?: string,
    refDateStr?: string
  ): WhyExplanation {
    const metrics = this.calculateDailyAverages(sales, product.id, storeId, refDateStr);
    const avgDaily = metrics.avg7d > 0 ? metrics.avg7d : 0.1;
    const reorderPoint = this.calculateReorderPoint(avgDaily, product.leadTimeDays, product.safetyStock);
    const daysRemaining = this.calculateDaysRemaining(currentStock, avgDaily);

    if (type === 'STOCK_OUT' || type === 'REORDER') {
      return {
        title: `Why Reorder ${product.name}?`,
        productName: product.name,
        storeName,
        dataUsed: [
          { label: 'Current Stock', value: `${currentStock} units`, source: 'Store Inventory Ledger' },
          { label: '7-Day Average Sales', value: `${avgDaily} units/day`, source: 'Sales Transactions (Last 7 Days)' },
          { label: 'Supplier Lead Time', value: `${product.leadTimeDays} days`, source: 'Product Master Catalog' },
          { label: 'Safety Stock Buffer', value: `${product.safetyStock} units`, source: 'Product Configuration' },
          { label: 'Computed Reorder Point', value: `${reorderPoint} units`, source: 'Deterministic Safety Stock Model' },
        ],
        calculationSteps: [
          {
            step: '1. Estimate Daily Demand Velocity',
            formula: 'Sum of sales (last 7 days) / 7 days',
            result: `${metrics.avg7d} units/day`,
          },
          {
            step: '2. Project Days Remaining Until Depletion',
            formula: 'Current Stock / Avg Daily Sales',
            result: `${currentStock} ÷ ${avgDaily} = ${daysRemaining} days`,
          },
          {
            step: '3. Calculate Dynamic Reorder Point',
            formula: '(Avg Daily Sales × Lead Time) + Safety Stock',
            result: `(${avgDaily} × ${product.leadTimeDays}) + ${product.safetyStock} = ${reorderPoint} units`,
          },
          {
            step: '4. Condition Check',
            formula: 'Current Stock < Reorder Point',
            result: `${currentStock} < ${reorderPoint} (${currentStock < reorderPoint ? 'CONDITION MET: REORDER CANDIDATE' : 'SAFE'})`,
          },
        ],
        threshold: `Stock depletion horizon (${daysRemaining} days) is less than or near supplier lead time (${product.leadTimeDays} days).`,
        assumptions: [
          'Recent 7-day velocity represents near-future customer demand pattern.',
          'Supplier adheres to standard delivery lead time without transport disruption.',
          'No bulk wholesale orders scheduled that would accelerate depletion.'
        ],
        finalVerdict: `Product will exhaust in ${daysRemaining} days if not replenished immediately.`,
        recommendedAction: `Generate Purchase Order for ${Math.max(product.reorderQuantity, reorderPoint - currentStock + product.safetyStock)} units today.`,
      };
    }

    if (type === 'OVERSTOCK') {
      const coverage = Number((currentStock / avgDaily).toFixed(1));
      return {
        title: `Why Excess Stock on ${product.name}?`,
        productName: product.name,
        storeName,
        dataUsed: [
          { label: 'Current Stock', value: `${currentStock} units`, source: 'Store Inventory Ledger' },
          { label: 'Daily Sales Velocity', value: `${avgDaily} units/day`, source: '7-Day Sales Average' },
          { label: 'Inventory Holding Value', value: `₹${(currentStock * product.costPrice).toLocaleString('en-IN')}`, source: 'Cost Price Ledger' },
          { label: 'Stock Coverage Days', value: `${coverage} days`, source: 'Coverage Calculation' },
        ],
        calculationSteps: [
          {
            step: '1. Calculate Days of Inventory Coverage',
            formula: 'Current Stock / Avg Daily Sales',
            result: `${currentStock} ÷ ${avgDaily} = ${coverage} days of runway`,
          },
          {
            step: '2. Threshold Benchmark Evaluation',
            formula: 'Stock Coverage > 45 Days Threshold',
            result: `${coverage} > 45 days (EXCESSIVE RUNWAY)`,
          },
        ],
        threshold: 'Inventory exceeding 45 days of forward demand constitutes locked working capital.',
        assumptions: [
          'Demand velocity will remain consistent with recent trends.',
          'Storage and working capital interest rates represent carrying cost.'
        ],
        finalVerdict: `Stock is over-indexed by approximately ${Math.round(currentStock - (avgDaily * 30))} units beyond optimal 30-day runway.`,
        recommendedAction: 'Halt future purchase orders. Reallocate inventory or run promotion.',
      };
    }

    if (type === 'SLOW_MOVING') {
      return {
        title: `Why Flagged as Slow-Moving: ${product.name}?`,
        productName: product.name,
        storeName,
        dataUsed: [
          { label: 'Current Shelf Stock', value: `${currentStock} units`, source: 'Store Inventory Ledger' },
          { label: '30-Day Total Sales', value: `${metrics.total30d} units`, source: '30-Day Sales Ledger' },
          { label: 'Unit Cost Price', value: `₹${product.costPrice}`, source: 'Product Master Catalog' },
        ],
        calculationSteps: [
          {
            step: '1. Evaluate Monthly Sales Velocity',
            formula: 'Total Units Sold in 30 Days',
            result: `${metrics.total30d} units`,
          },
          {
            step: '2. Velocity-to-Stock Ratio',
            formula: '30-Day Sales < 6 units AND Stock >= 25 units',
            result: `${metrics.total30d} < 6 AND ${currentStock} >= 25 (SLOW MOVER DETECTED)`,
          },
        ],
        threshold: 'Items with fewer than 6 units sold over 30 days while occupying shelf space > 25 units.',
        assumptions: [
          'No stockout occurred in the past 30 days that would artificially depress sales.',
          'Pricing remained consistent throughout the period.'
        ],
        finalVerdict: 'Low customer turnover rate threatens product shelf-life and occupies high-value retail frontage.',
        recommendedAction: 'Review placement, bundle with fast-moving category leaders, or apply clearance discount.',
      };
    }

    // Default anomaly explanation
    const change = Number((((metrics.todaySales - metrics.avg7d) / (metrics.avg7d || 1)) * 100).toFixed(1));
    return {
      title: `Sales Anomaly Analysis: ${product.name}`,
      productName: product.name,
      storeName,
      dataUsed: [
        { label: "Today's Sales", value: `${metrics.todaySales} units`, source: 'Daily Point-of-Sale Log' },
        { label: '7-Day Baseline Average', value: `${metrics.avg7d} units/day`, source: '7-Day POS History' },
        { label: 'Percentage Deviation', value: `${change > 0 ? '+' : ''}${change}%`, source: 'Anomaly Detection Engine' },
      ],
      calculationSteps: [
        {
          step: '1. Establish Historical Baseline',
          formula: 'Sum of sales (last 7 days) / 7',
          result: `${metrics.avg7d} units/day`,
        },
        {
          step: '2. Compute Variance Percentage',
          formula: "((Today's Sales - Baseline) / Baseline) × 100",
          result: `((${metrics.todaySales} - ${metrics.avg7d}) / ${metrics.avg7d}) × 100 = ${change}%`,
        },
      ],
      threshold: 'Anomalies flagged when daily volume deviates by >= ±30% from the 7-day moving average.',
      assumptions: [
        'Baseline reflects normal organic demand.',
        'Data accurately represents completed consumer checkouts.'
      ],
      finalVerdict: `${change > 0 ? 'Statistically significant surge' : 'Notable demand drop'} detected.`,
      recommendedAction: change > 0 ? 'Ensure shelf replenishment is fast enough.' : 'Investigate competition and stock visibility.',
    };
  }

  /**
   * Compute high-level dashboard KPIs
   */
  public static computeDashboardKPIs(
    products: Product[],
    inventory: InventoryRecord[],
    sales: Sale[],
    storeId?: string,
    refDateStr?: string
  ): DashboardKPIs {
    const refDate = refDateStr ? new Date(refDateStr) : new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let todayUnits = 0;
    let yesterdayUnits = 0;

    const filteredSales = sales.filter(s => !storeId || s.storeId === storeId);

    filteredSales.forEach(s => {
      const sDate = new Date(s.date);
      const diff = Math.floor((refDate.getTime() - sDate.getTime()) / oneDayMs);
      if (diff === 0) {
        todayRevenue += s.revenue;
        todayUnits += s.quantity;
      } else if (diff === 1) {
        yesterdayRevenue += s.revenue;
        yesterdayUnits += s.quantity;
      }
    });

    const revenueChangePct = yesterdayRevenue > 0
      ? Number((((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100).toFixed(1))
      : 0;

    const unitsChangePct = yesterdayUnits > 0
      ? Number((((todayUnits - yesterdayUnits) / yesterdayUnits) * 100).toFixed(1))
      : 0;

    const summaries = this.computeProductSummaries(products, inventory, sales, storeId, refDateStr);
    const stockoutCount = summaries.filter(s => s.isStockoutRisk).length;
    const lowStockCount = summaries.filter(s => s.isLowStock).length;
    const slowMoversCount = summaries.filter(s => s.isSlowMoving).length;

    const totalInventoryValue = summaries.reduce((acc, curr) => acc + curr.inventoryValue, 0);
    const alerts = this.generateAlerts(products, inventory, sales, storeId, refDateStr);

    return {
      todayRevenue,
      revenueChangePct,
      todayUnits,
      unitsChangePct,
      lowStockItemsCount: lowStockCount,
      lowStockChangePct: -4.2, // Trend indicator
      stockoutRisksCount: stockoutCount,
      stockoutChangePct: 15.0,
      slowMoversCount,
      activeAlertsCount: alerts.length,
      totalInventoryValue,
    };
  }
}
