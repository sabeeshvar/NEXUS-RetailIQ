import { CopilotMessage, CopilotIntent, CopilotMetric, WhyExplanation } from '../types';
import { DataRepository } from './dataRepository';
import { AnalyticsEngine } from '../lib/analytics/engine';

export interface CopilotQueryOptions {
  storeId?: string;
  userApiKey?: string;
}

export class CopilotService {
  /**
   * Process a manager's natural language question
   */
  public static async askCopilot(
    question: string,
    options?: CopilotQueryOptions
  ): Promise<CopilotMessage> {
    const cleanQ = question.trim().toLowerCase();
    const stores = DataRepository.getStores();
    const products = DataRepository.getProducts();
    const sales = DataRepository.getSales();
    const inventory = DataRepository.getInventory();

    const selectedStoreId = options?.storeId && options.storeId !== 'all' ? options.storeId : undefined;
    const storeName = selectedStoreId
      ? stores.find(s => s.id === selectedStoreId)?.name || 'Selected Store'
      : 'All Stores';

    // 1. Check for Insufficient Data queries (out of bounds dates or unrecorded dimensions)
    if (
      cleanQ.includes('last year') ||
      cleanQ.includes('diwali last year') ||
      cleanQ.includes('2023') ||
      cleanQ.includes('2022') ||
      cleanQ.includes('factory batch') ||
      cleanQ.includes('customer name') ||
      cleanQ.includes('loyalty points') ||
      cleanQ.includes('weather forecast')
    ) {
      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: `I cannot answer this reliably because the available retail dataset does not contain historical records for that period or dimension.\n\nOur current dataset spans the latest 90-day trading window across ${stores.length || 3} stores. I can, however, evaluate your recent 7-day or 30-day sales velocity, stockout risks, or reorder needs.`,
        intent: 'INSUFFICIENT_DATA',
        confidence: 'INSUFFICIENT_DATA',
        dataAvailable: false,
        assumptions: [
          'The POS database contains only the current 90-day operating history.',
          'External macro/customer identity records are not connected to this catalog.'
        ],
        recommendation: 'Query recent 7-day/30-day sales performance or reorder status for available inventory.',
      };
    }

    // 2. Deterministic Intent Detection & Scoped Calculations
    const summaries = AnalyticsEngine.computeProductSummaries(products, inventory, sales, selectedStoreId);
    const anomalies = AnalyticsEngine.detectSalesAnomalies(products, sales, selectedStoreId);

    // Intent 1: REORDER / STOCK_OUT
    if (
      cleanQ.includes('reorder') ||
      cleanQ.includes('stock out') ||
      cleanQ.includes('running out') ||
      cleanQ.includes('run out') ||
      cleanQ.includes('low stock') ||
      cleanQ.includes('attention')
    ) {
      const stockoutCandidates = summaries
        .filter(s => s.isStockoutRisk || s.isLowStock)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      const topCandidates = stockoutCandidates.slice(0, 5);

      if (topCandidates.length === 0) {
        return {
          id: `copilot-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: `All inventory levels are currently within safe operating buffers across ${storeName}. No products are projected to stock out within their lead time windows.`,
          intent: 'STOCK_OUT',
          confidence: 'HIGH',
          dataAvailable: true,
          assumptions: ['Safety stock buffers maintained based on 7-day velocity.'],
          recommendation: 'Continue regular daily sales monitoring.',
        };
      }

      const primary = topCandidates[0];
      const numbers: CopilotMetric[] = topCandidates.map(c => ({
        label: c.product.name,
        value: `${c.currentStock} in stock (${c.daysRemaining}d runway, reorder ${c.recommendedReorderQty} units)`,
        context: `Avg velocity: ${c.avgDailySales7d}/day, Lead time: ${c.product.leadTimeDays}d`,
      }));

      const explanation: WhyExplanation = AnalyticsEngine.buildWhyExplanation(
        primary.product,
        storeName,
        primary.currentStock,
        sales,
        'REORDER',
        selectedStoreId
      );

      const listText = topCandidates.map((c, i) =>
        `${i + 1}. **${c.product.name}**\n   - Current Stock: **${c.currentStock} units**\n   - 7-Day Velocity: **${c.avgDailySales7d} units/day**\n   - Days Remaining: **${c.daysRemaining} days**\n   - Reorder Point: **${c.reorderPoint} units**\n   - Recommended Action: **Reorder ${c.recommendedReorderQty} units**`
      ).join('\n\n');

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: `### ${topCandidates.length} products require immediate replenishment\n\n${listText}`,
        intent: 'REORDER',
        numbers,
        evidence: `Analyzed POS inventory ledger and 7-day sales velocity across ${storeName}.`,
        recommendation: `Issue purchase orders for ${topCandidates.map(c => c.product.name).join(', ')} before stock depletes below lead time thresholds.`,
        assumptions: [
          'Demand velocity projected using 7-day moving average.',
          'Supplier lead times and safety stocks derived from product master catalog.',
          'Reorder point = (Avg Daily Sales × Supplier Lead Time) + Safety Stock.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
        explanation,
      };
    }

    // Intent 2: SLOW_MOVING / OVERSTOCK
    if (
      cleanQ.includes('slow') ||
      cleanQ.includes('not moving') ||
      cleanQ.includes('overstock') ||
      cleanQ.includes('excess') ||
      cleanQ.includes('dead stock')
    ) {
      const slowMovers = summaries
        .filter(s => s.isSlowMoving || s.isOverstocked)
        .sort((a, b) => b.stockCoverageDays - a.stockCoverageDays);

      const topSlow = slowMovers.slice(0, 4);

      if (topSlow.length === 0) {
        return {
          id: `copilot-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: `Inventory turnover is healthy across ${storeName}. No products exceed the 45-day runway ceiling or have fewer than 6 sales in the last 30 days.`,
          intent: 'SLOW_MOVING',
          confidence: 'HIGH',
          dataAvailable: true,
          assumptions: ['Slow-moving criteria: stock >= 25 with 30-day velocity < 6 units.'],
          recommendation: 'Maintain current purchasing schedules.',
        };
      }

      const primary = topSlow[0];
      const numbers: CopilotMetric[] = topSlow.map(s => ({
        label: s.product.name,
        value: `${s.currentStock} units in stock (${s.stockCoverageDays} days coverage)`,
        context: `30-day sales: ${s.salesLast30Days} units, Value: ₹${s.inventoryValue.toLocaleString('en-IN')}`,
      }));

      const explanation: WhyExplanation = AnalyticsEngine.buildWhyExplanation(
        primary.product,
        storeName,
        primary.currentStock,
        sales,
        primary.isSlowMoving ? 'SLOW_MOVING' : 'OVERSTOCK',
        selectedStoreId
      );

      const listText = topSlow.map((s, i) =>
        `${i + 1}. **${s.product.name}** (${s.product.category})\n   - Current Stock: **${s.currentStock} units**\n   - 30-Day Sales: **${s.salesLast30Days} units**\n   - Estimated Coverage: **${s.stockCoverageDays} days**\n   - Capital Tied Up: **₹${s.inventoryValue.toLocaleString('en-IN')}**\n   - Suggested Action: **${s.isSlowMoving ? 'Bundle with fast-moving category leaders or apply promo discount' : 'Pause future purchase orders'}**`
      ).join('\n\n');

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: `### Detected ${topSlow.length} overstocked or slow-moving items\n\n${listText}`,
        intent: 'SLOW_MOVING',
        numbers,
        evidence: `Evaluated 30-day sales velocity and stock coverage against standard retail benchmarks.`,
        recommendation: `Pause automated replenishment for ${topSlow.map(s => s.product.name).join(', ')} and rebalance inventory across higher-turnover stores.`,
        assumptions: [
          'Coverage exceeding 45 days is classified as excess working capital lockup.',
          'Slow-moving threshold: stock >= 25 units with 30-day sales < 6 units.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
        explanation,
      };
    }

    // Intent 3: SALES SPIKES & DROPS
    if (
      cleanQ.includes('spike') ||
      cleanQ.includes('drop') ||
      cleanQ.includes('unusual') ||
      cleanQ.includes('surge') ||
      cleanQ.includes('anomaly')
    ) {
      const spikes = anomalies.spikes;
      const drops = anomalies.drops;

      const numbers: CopilotMetric[] = [];
      let text = '### Today\'s Sales Anomalies vs 7-Day Baseline\n\n';

      if (spikes.length > 0) {
        text += '**Surging Products (+30% or higher):**\n';
        spikes.forEach(s => {
          text += `- **${s.product.name}**: **${s.todaySales} units** today vs **${s.baseline} baseline** (+${s.changePct}% surge)\n`;
          numbers.push({ label: `${s.product.name} Surge`, value: `+${s.changePct}%`, context: `${s.todaySales} vs ${s.baseline} avg` });
        });
        text += '\n';
      }

      if (drops.length > 0) {
        text += '**Slumping Products (-30% or lower):**\n';
        drops.forEach(d => {
          text += `- **${d.product.name}**: **${d.todaySales} units** today vs **${d.baseline} baseline** (${d.changePct}% dip)\n`;
          numbers.push({ label: `${d.product.name} Drop`, value: `${d.changePct}%`, context: `${d.todaySales} vs ${d.baseline} avg` });
        });
      }

      if (spikes.length === 0 && drops.length === 0) {
        text = 'No significant sales spikes or drops (deviation >= ±30%) detected in today\'s sales log compared to 7-day moving averages.';
      }

      const primary = spikes[0] || drops[0];
      const explanation: WhyExplanation | undefined = primary
        ? AnalyticsEngine.buildWhyExplanation(
            primary.product,
            storeName,
            summaries.find(s => s.product.id === primary.product.id)?.currentStock || 30,
            sales,
            spikes[0] ? 'SALES_SPIKE' : 'SALES_DROP',
            selectedStoreId
          )
        : undefined;

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: text,
        intent: 'SALES_SPIKE',
        numbers,
        evidence: `Compared today's point-of-sale volume against the preceding 7-day historical moving average.`,
        recommendation: spikes.length > 0
          ? 'Check floor replenishment on surging items to avoid premature stockouts.'
          : 'Inspect shelf presence and competitor activity for underperforming products.',
        assumptions: [
          '7-day moving average represents normal organic demand baseline.',
          'Anomalies filtered to require baseline >= 3 units/day to eliminate statistical noise.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
        explanation,
      };
    }

    // Intent 4: STORE COMPARISON
    if (
      cleanQ.includes('compare') ||
      cleanQ.includes('stores') ||
      cleanQ.includes('worst store') ||
      cleanQ.includes('best store') ||
      cleanQ.includes('biggest drop')
    ) {
      const storeMetrics = stores.map(store => {
        const storeSales = sales.filter(s => s.storeId === store.id);
        const storeInv = inventory.filter(i => i.storeId === store.id);
        const storeProducts = products;
        const kpis = AnalyticsEngine.computeDashboardKPIs(storeProducts, storeInv, storeSales, store.id);
        const sums = AnalyticsEngine.computeProductSummaries(storeProducts, storeInv, storeSales, store.id);
        const totalRevenue30d = sums.reduce((acc, c) => acc + c.revenue30d, 0);

        return {
          store,
          todayRevenue: kpis.todayRevenue,
          revenueChangePct: kpis.revenueChangePct,
          totalRevenue30d,
          stockoutCount: kpis.stockoutRisksCount,
          inventoryValue: kpis.totalInventoryValue,
        };
      });

      storeMetrics.sort((a, b) => b.todayRevenue - a.todayRevenue);

      const numbers: CopilotMetric[] = storeMetrics.map(sm => ({
        label: sm.store.name,
        value: `₹${sm.todayRevenue.toLocaleString('en-IN')} today`,
        context: `30d Rev: ₹${sm.totalRevenue30d.toLocaleString('en-IN')}, Stockouts: ${sm.stockoutCount}`,
      }));

      const listText = storeMetrics.map((sm, i) =>
        `${i + 1}. **${sm.store.name}**\n   - Today's Revenue: **₹${sm.todayRevenue.toLocaleString('en-IN')}** (${sm.revenueChangePct >= 0 ? '+' : ''}${sm.revenueChangePct}% vs yesterday)\n   - 30-Day Revenue: **₹${sm.totalRevenue30d.toLocaleString('en-IN')}**\n   - Active Stockout Risks: **${sm.stockoutCount} SKUs**\n   - Current Stock Valuation: **₹${sm.inventoryValue.toLocaleString('en-IN')}**`
      ).join('\n\n');

      const topStore = storeMetrics[0];
      const bottomStore = storeMetrics[storeMetrics.length - 1];

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: `### Cross-Store Performance Comparison\n\n${listText}\n\n**Key Takeaway**: **${topStore.store.name}** is driving the highest volume, while **${bottomStore.store.name}** has lower turnover and warrants a review of stock allocations.`,
        intent: 'STORE_PERFORMANCE',
        numbers,
        evidence: `Aggregated POS transactions and inventory ledgers across all ${stores.length} retail locations.`,
        recommendation: `Consider reallocating slow-moving stock from ${bottomStore.store.name} to ${topStore.store.name} to maximize inventory turnover without incurring additional purchasing expenditure.`,
        assumptions: [
          'Store comparisons reflect identical product catalog availability.',
          'Revenue figures are net of any returned goods.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
      };
    }

    // Intent 5: PRODUCT PERFORMANCE / SPECIFIC PRODUCT SEARCH
    const matchedProduct = products.find(p => cleanQ.includes(p.name.toLowerCase()) || cleanQ.includes(p.sku.toLowerCase()) || cleanQ.includes(p.name.split(' ')[0].toLowerCase()));
    if (matchedProduct || cleanQ.includes('top product') || cleanQ.includes('best selling')) {
      const targetSummary = matchedProduct
        ? summaries.find(s => s.product.id === matchedProduct.id)
        : summaries.sort((a, b) => b.salesLast30Days - a.salesLast30Days)[0];

      if (targetSummary) {
        const p = targetSummary.product;
        const numbers: CopilotMetric[] = [
          { label: 'Current Stock', value: `${targetSummary.currentStock} units`, context: `${targetSummary.daysRemaining} days remaining` },
          { label: '7-Day Avg Sales', value: `${targetSummary.avgDailySales7d} units/day` },
          { label: '30-Day Volume', value: `${targetSummary.salesLast30Days} units`, context: `₹${targetSummary.revenue30d.toLocaleString('en-IN')} revenue` },
          { label: 'Gross Margin', value: `${targetSummary.grossMarginPct}%`, context: `Cost ₹${p.costPrice} / Sell ₹${p.sellingPrice}` },
        ];

        const explanation = AnalyticsEngine.buildWhyExplanation(
          p,
          storeName,
          targetSummary.currentStock,
          sales,
          targetSummary.isStockoutRisk ? 'STOCK_OUT' : 'REORDER',
          selectedStoreId
        );

        return {
          id: `copilot-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: `### Performance Dossier: ${p.name}\n\n- **SKU**: \`${p.sku}\` | **Category**: ${p.category} | **Supplier**: ${p.supplier}\n- **Current Inventory**: **${targetSummary.currentStock} units** (${targetSummary.daysRemaining} days of sales remaining)\n- **Recent Velocity**: **${targetSummary.avgDailySales7d} units/day** (7d avg) | **${targetSummary.salesToday} units sold today**\n- **30-Day Performance**: **${targetSummary.salesLast30Days} units** generated **₹${targetSummary.revenue30d.toLocaleString('en-IN')}**\n- **Unit Economics**: Selling Price: **₹${p.sellingPrice}**, Cost: **₹${p.costPrice}**, Estimated Gross Margin: **${targetSummary.grossMarginPct}%**\n- **Reorder Status**: ${targetSummary.isStockoutRisk ? '⚠️ **CRITICAL STOCK-OUT RISK**' : targetSummary.isLowStock ? '⚡ **REORDER POINT REACHED**' : '✅ **HEALTHY INVENTORY**'}`,
          intent: 'PRODUCT_PERFORMANCE',
          numbers,
          evidence: `Retrieved historical sales ledgers and inventory positions for SKU ${p.sku} across ${storeName}.`,
          recommendation: targetSummary.isStockoutRisk
            ? `Place urgent purchase order for ${targetSummary.recommendedReorderQty} units immediately.`
            : `Maintain standard replenishment cycles with supplier lead time of ${p.leadTimeDays} days.`,
          assumptions: [
            'Gross margin excludes variable store overhead and transportation costs.',
            'Velocity is calculated from verified checkout register receipts.'
          ],
          confidence: 'HIGH',
          dataAvailable: true,
          explanation,
        };
      }
    }

    // Default: General Dashboard / Executive Overview
    const kpis = AnalyticsEngine.computeDashboardKPIs(products, inventory, sales, selectedStoreId);
    return {
      id: `copilot-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      content: `### Executive Daily Business Health (${storeName})\n\n- **Today's Revenue**: **₹${kpis.todayRevenue.toLocaleString('en-IN')}** (${kpis.revenueChangePct >= 0 ? '+' : ''}${kpis.revenueChangePct}% vs yesterday)\n- **Units Sold**: **${kpis.todayUnits} units**\n- **Immediate Attention Needed**: **${kpis.stockoutRisksCount} products** at stock-out risk, and **${kpis.lowStockItemsCount} items** below reorder point.\n- **Total Stock Valuation**: **₹${kpis.totalInventoryValue.toLocaleString('en-IN')}** across ${products.length} active SKUs.\n\nAsk me specific questions like: *"What should I reorder today?"*, *"Which products are not moving?"*, or *"Show me today's sales spikes."*`,
      intent: 'DASHBOARD_SUMMARY',
      numbers: [
        { label: "Today's Revenue", value: `₹${kpis.todayRevenue.toLocaleString('en-IN')}`, context: `${kpis.revenueChangePct}% vs yesterday` },
        { label: 'Units Sold', value: `${kpis.todayUnits} units` },
        { label: 'Stock-out Risks', value: `${kpis.stockoutRisksCount} SKUs` },
        { label: 'Inventory Value', value: `₹${kpis.totalInventoryValue.toLocaleString('en-IN')}` },
      ],
      evidence: `Aggregated 90-day POS records and current store inventories across ${storeName}.`,
      recommendation: `Prioritize review of the ${kpis.stockoutRisksCount} critical stockout risks in the 'Needs Attention Today' queue.`,
      assumptions: [
        'Revenue calculated from registered sales receipts.',
        'Inventory values calculated at unit cost prices.'
      ],
      confidence: 'HIGH',
      dataAvailable: true,
    };
  }
}
