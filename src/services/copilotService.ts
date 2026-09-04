import { CopilotMessage, CopilotMetric, WhyExplanation } from '../types';
import { DataRepository } from './dataRepository';
import { AnalyticsEngine } from '../lib/analytics/engine';
import { GoogleGenAI } from '@google/genai';

export interface CopilotQueryOptions {
  storeId?: string;
  userApiKey?: string;
}

/**
 * Call Gemini 3.6 Flash via server-side Vite proxy first, or fallback to client SDK
 */
async function callGemini(
  prompt: string,
  verifiedContext: string,
  apiKey?: string
): Promise<string | null> {
  // 1. Attempt secure server proxy (/api/copilot)
  try {
    const res = await fetch('/api/copilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: prompt, verifiedContext }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.text) {
        return data.text;
      }
    }
  } catch {
    // Server proxy unavailable in static/offline environments
  }

  // 2. Direct client SDK call if runtime key is configured
  const key =
    apiKey ||
    localStorage.getItem('nexus_user_gemini_key') ||
    import.meta.env.VITE_GEMINI_API_KEY;

  if (!key) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `You are NEXUS RetailIQ Copilot, an expert AI sales and inventory copilot for retail store managers.
STRICT OPERATIONAL & NO-HALLUCINATION RULES:
1. You MUST NEVER invent or hallucinate sales numbers, inventory levels, dates, products, or stores.
2. Quote and explain ONLY using the verified figures provided in the verified data context below.
3. If the data context says information is missing or insufficient, state clearly: "I don't have enough data to answer this reliably" and specify the exact missing dimension.
4. Provide a structured, professional executive response:
   - Direct concise executive answer
   - Bullet points of verified metrics with exact numbers
   - Actionable management recommendation

Manager Question: "${prompt}"

Verified Ground Truth POS Data:
${verifiedContext}`,
    });

    return response.text || null;
  } catch (err: any) {
    console.warn('[RetailIQ Copilot] Gemini client error (using deterministic engine):', err?.message);
    return null;
  }
}

export class CopilotService {
  /**
   * Process a manager's natural language question strictly grounded in the ACTIVE dataset
   */
  public static async askCopilot(
    question: string,
    options?: CopilotQueryOptions
  ): Promise<CopilotMessage> {
    const cleanQ = question.trim().toLowerCase();
    const activeSource = DataRepository.getActiveDataSource();
    const metadata = DataRepository.getDataSourceMetadata();

    const stores = DataRepository.getStores();
    const products = DataRepository.getProducts();
    const sales = DataRepository.getSales();
    const inventory = DataRepository.getInventory();

    const selectedStoreId = options?.storeId && options.storeId !== 'all' ? options.storeId : undefined;
    const storeName = selectedStoreId
      ? stores.find(s => s.id === selectedStoreId)?.name || 'Selected Store'
      : 'All Stores (Consolidated)';

    // Source description for provenance
    const sourceLabel =
      activeSource === 'UPLOADED_CSV'
        ? `Uploaded CSV (${metadata?.fileName || 'dataset.csv'})`
        : activeSource === 'UPLOADED_SQLITE'
        ? `SQLite Database (${metadata?.fileName || 'database.db'})`
        : activeSource === 'FIRESTORE'
        ? 'Cloud Firestore'
        : 'Demo POS Dataset';

    const provenanceString = `Based on your ${sourceLabel} • ${sales.length.toLocaleString()} transaction records • ${products.length} products • ${stores.length} store(s)`;

    // =========================================================================
    // GUARD 1: No active data in system at all
    // =========================================================================
    if (products.length === 0 && sales.length === 0) {
      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: `I don't have enough data to answer this reliably. There is no active retail dataset loaded in the application.\n\nPlease upload a CSV/SQLite file in the **Import Data** section or click **Load Demo Data** to populate retail transactions.`,
        intent: 'INSUFFICIENT_DATA',
        confidence: 'INSUFFICIENT_DATA',
        dataAvailable: false,
        dataSource: activeSource,
        provenance: 'No dataset loaded',
        assumptions: ['No sales or inventory ledgers found in working memory.'],
        recommendation: 'Import a POS transaction file via the Import Data page.',
      };
    }

    // =========================================================================
    // GUARD 2: Explicit out-of-bounds dates / external macro dimensions
    // =========================================================================
    if (
      cleanQ.includes('last year') ||
      cleanQ.includes('diwali') ||
      cleanQ.includes('2023') ||
      cleanQ.includes('2022') ||
      cleanQ.includes('factory batch') ||
      cleanQ.includes('customer name') ||
      cleanQ.includes('loyalty points') ||
      cleanQ.includes('weather forecast')
    ) {
      const dateRangeStr = metadata?.dateRange
        ? `${metadata.dateRange.min} to ${metadata.dateRange.max}`
        : 'the active operating period';

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: `I don't have enough data to answer this reliably. Your active dataset (${metadata?.fileName || 'current store records'}) spans ${dateRangeStr} and does not contain historical transaction records for that time window or customer dimension.\n\nI can, however, evaluate your recent daily sales velocity, inventory runway, stockout risks, or reorder needs based on your active data.`,
        intent: 'INSUFFICIENT_DATA',
        confidence: 'INSUFFICIENT_DATA',
        dataAvailable: false,
        dataSource: activeSource,
        provenance: provenanceString,
        assumptions: [
          `Active dataset covers ${dateRangeStr}.`,
          'External macro/loyalty databases are not connected to this catalog.'
        ],
        recommendation: 'Ask questions regarding available inventory runways, sales velocity, or replenishment priorities.',
      };
    }

    // =========================================================================
    // GUARD 3: Inventory-dependent questions when INVENTORY DATA IS MISSING
    // =========================================================================
    const isInventoryQuery =
      cleanQ.includes('reorder') ||
      cleanQ.includes('stock out') ||
      cleanQ.includes('run out') ||
      cleanQ.includes('running out') ||
      cleanQ.includes('low stock') ||
      cleanQ.includes('overstock') ||
      cleanQ.includes('slow moving') ||
      cleanQ.includes('dead stock') ||
      cleanQ.includes('current stock');

    if (isInventoryQuery && (inventory.length === 0 || metadata?.hasInventoryData === false)) {
      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: `I don't have enough inventory data to determine what should be reordered or what is at stock-out risk. Your active dataset (${metadata?.fileName || 'uploaded file'}) contains sales transaction records, but current physical stock levels are missing.\n\nPlease upload or map a **Current Stock on Hand** column in the **Import Data** page to enable deterministic inventory runway calculations.`,
        intent: 'INSUFFICIENT_DATA',
        confidence: 'INSUFFICIENT_DATA',
        dataAvailable: false,
        dataSource: activeSource,
        provenance: provenanceString,
        assumptions: [
          'Inventory calculation requires Current Stock / Average Daily Sales.',
          'No stock balance records found in the active dataset.'
        ],
        recommendation: 'Navigate to Import Data and map the Current Stock field.',
      };
    }

    // =========================================================================
    // Compute deterministic scoped analytics from the active dataset
    // =========================================================================
    const summaries = AnalyticsEngine.computeProductSummaries(products, inventory, sales, selectedStoreId);
    const anomalies = AnalyticsEngine.detectSalesAnomalies(products, sales, selectedStoreId);
    const kpis = AnalyticsEngine.computeDashboardKPIs(products, inventory, sales, selectedStoreId);

    // =========================================================================
    // INTENT 1: STOCK_OUT (Depleting in <= 3 days)
    // =========================================================================
    if (
      cleanQ.includes('run out in the next 3 days') ||
      cleanQ.includes('next 3 days') ||
      cleanQ.includes('run out first') ||
      cleanQ.includes('stock out first')
    ) {
      const urgent3d = summaries
        .filter(s => s.daysRemaining <= 3.0 && s.currentStock > 0)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      const numbers: CopilotMetric[] = urgent3d.map(c => ({
        label: c.product.name,
        value: `${c.currentStock} units (${c.daysRemaining} days runway)`,
        context: `Daily velocity: ${c.avgDailySales7d}/day, Reorder needed: ${c.recommendedReorderQty} units`,
      }));

      const primary = urgent3d[0] || summaries[0];
      const explanation = primary ? AnalyticsEngine.buildWhyExplanation(
        primary.product,
        storeName,
        primary.currentStock,
        sales,
        'STOCK_OUT',
        selectedStoreId
      ) : undefined;

      const listText = urgent3d.length > 0
        ? urgent3d.map((c, i) =>
            `${i + 1}. **${c.product.name}** (${c.product.category})\n   - Current Stock: **${c.currentStock} units**\n   - Daily Sales Velocity: **${c.avgDailySales7d} units/day**\n   - Projected Runway: **${c.daysRemaining} days**\n   - Reorder Point: **${c.reorderPoint} units**\n   - Recommended Action: **Reorder ${c.recommendedReorderQty} units**`
          ).join('\n\n')
        : '✅ No products in your active dataset are projected to deplete within the next 3 days based on verified sales velocity.';

      const verifiedContext = `Data Source: ${sourceLabel}
Store Scope: ${storeName}
Products Depleting in <= 3 Days:
${urgent3d.map(c => `- ${c.product.name}: Stock = ${c.currentStock} units, Velocity = ${c.avgDailySales7d}/day, Runway = ${c.daysRemaining}d, Reorder Point = ${c.reorderPoint}, Recommended Order = ${c.recommendedReorderQty} units`).join('\n') || 'None'}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### ${urgent3d.length} product(s) will run out in the next 3 days\n\n${listText}`,
        intent: 'STOCK_OUT',
        numbers,
        evidence: `Analyzed physical stock levels and trailing daily sales velocity across ${storeName}.`,
        recommendation: urgent3d.length > 0
          ? `Place immediate purchase orders for ${urgent3d.map(c => c.product.name).join(', ')} before stock depletes below supplier lead time.`
          : 'Continue standard inventory monitoring.',
        assumptions: [
          'Demand velocity projected using 7-day moving average from active dataset.',
          'Days Remaining = Current Stock / Average Daily Sales.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
        explanation,
        dataSource: activeSource,
        provenance: provenanceString,
      };
    }

    // =========================================================================
    // INTENT 2: REORDER / LOW_STOCK
    // =========================================================================
    if (
      cleanQ.includes('what should i reorder') ||
      cleanQ.includes('reorder today') ||
      cleanQ.includes('reorder') ||
      cleanQ.includes('low stock') ||
      cleanQ.includes('what needs attention') ||
      cleanQ.includes('attention today')
    ) {
      const stockoutCandidates = summaries
        .filter(s => s.isStockoutRisk || s.isLowStock)
        .sort((a, b) => a.daysRemaining - b.daysRemaining);

      const topCandidates = stockoutCandidates.slice(0, 5);
      const primary = topCandidates[0] || summaries[0];

      const numbers: CopilotMetric[] = topCandidates.map(c => ({
        label: c.product.name,
        value: `${c.currentStock} in stock (${c.daysRemaining}d runway)`,
        context: `Velocity: ${c.avgDailySales7d}/day, Reorder needed: ${c.recommendedReorderQty} units`,
      }));

      const explanation: WhyExplanation | undefined = primary
        ? AnalyticsEngine.buildWhyExplanation(
            primary.product,
            storeName,
            primary.currentStock,
            sales,
            'REORDER',
            selectedStoreId
          )
        : undefined;

      const listText = topCandidates.length > 0
        ? topCandidates.map((c, i) =>
            `${i + 1}. **${c.product.name}**\n   - Current Stock: **${c.currentStock} units**\n   - Daily Sales: **${c.avgDailySales7d} units/day**\n   - Days Remaining: **${c.daysRemaining} days**\n   - Reorder Point: **${c.reorderPoint} units**\n   - Recommended Order: **${c.recommendedReorderQty} units**`
          ).join('\n\n')
        : 'All inventory levels in your active dataset are currently above their respective reorder thresholds.';

      const verifiedContext = `Data Source: ${sourceLabel}
Store Scope: ${storeName}
Products Below Reorder Threshold:
${topCandidates.map(c => `- ${c.product.name}: Stock = ${c.currentStock}, Velocity = ${c.avgDailySales7d}/day, Days Remaining = ${c.daysRemaining}d, Reorder Point = ${c.reorderPoint}, Recommended Order = ${c.recommendedReorderQty} units, Lead Time = ${c.product.leadTimeDays}d`).join('\n') || 'None'}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### ${topCandidates.length} product(s) require replenishment today\n\n${listText}`,
        intent: 'REORDER',
        numbers,
        evidence: `Calculated reorder points using verified stock positions and daily sales history across ${storeName}.`,
        recommendation: topCandidates.length > 0
          ? `Issue purchase orders for ${topCandidates.map(c => c.product.name).join(', ')}.`
          : 'Inventory positions are healthy.',
        assumptions: [
          'Reorder point = (Average Daily Sales × Supplier Lead Time) + Safety Stock.',
          'Days remaining = Current Stock / Average Daily Sales.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
        explanation,
        dataSource: activeSource,
        provenance: provenanceString,
      };
    }

    // =========================================================================
    // INTENT 3: SLOW_MOVING / OVERSTOCK
    // =========================================================================
    if (
      cleanQ.includes('slow') ||
      cleanQ.includes('not moving') ||
      cleanQ.includes('overstock') ||
      cleanQ.includes('excess') ||
      cleanQ.includes('dead stock')
    ) {
      const isOverstockQuery = cleanQ.includes('overstock') || cleanQ.includes('excess');
      const candidates = isOverstockQuery
        ? summaries.filter(s => s.isOverstocked).sort((a, b) => b.stockCoverageDays - a.stockCoverageDays)
        : summaries.filter(s => s.isSlowMoving || s.isOverstocked).sort((a, b) => b.stockCoverageDays - a.stockCoverageDays);

      const topCandidates = candidates.slice(0, 5);
      const primary = topCandidates[0] || summaries[0];

      const numbers: CopilotMetric[] = topCandidates.map(s => ({
        label: s.product.name,
        value: `${s.currentStock} units (${s.stockCoverageDays} days coverage)`,
        context: `30d Sales: ${s.salesLast30Days} units, Value: ₹${s.inventoryValue.toLocaleString('en-IN')}`,
      }));

      const explanation: WhyExplanation | undefined = primary
        ? AnalyticsEngine.buildWhyExplanation(
            primary.product,
            storeName,
            primary.currentStock,
            sales,
            isOverstockQuery ? 'OVERSTOCK' : 'SLOW_MOVING',
            selectedStoreId
          )
        : undefined;

      const listText = topCandidates.length > 0
        ? topCandidates.map((s, i) =>
            `${i + 1}. **${s.product.name}** (${s.product.category})\n   - Current Stock: **${s.currentStock} units**\n   - 30-Day Sales: **${s.salesLast30Days} units**\n   - Estimated Stock Coverage: **${s.stockCoverageDays} days**\n   - Capital Locked: **₹${s.inventoryValue.toLocaleString('en-IN')}**\n   - Suggested Action: **${isOverstockQuery ? 'Pause supplier orders' : 'Bundle or markdown to clear stock'}**`
          ).join('\n\n')
        : `No ${isOverstockQuery ? 'overstocked' : 'slow-moving'} items detected in your active dataset.`;

      const verifiedContext = `Data Source: ${sourceLabel}
Store Scope: ${storeName}
${isOverstockQuery ? 'Overstocked SKUs' : 'Slow-Moving SKUs'}:
${topCandidates.map(s => `- ${s.product.name}: Stock = ${s.currentStock} units, 30d Sales = ${s.salesLast30Days} units, Coverage = ${s.stockCoverageDays}d, Locked Capital = ₹${s.inventoryValue}`).join('\n') || 'None'}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### Detected ${topCandidates.length} ${isOverstockQuery ? 'overstocked' : 'slow-moving'} items in active data\n\n${listText}`,
        intent: isOverstockQuery ? 'OVERSTOCK' : 'SLOW_MOVING',
        numbers,
        evidence: `Analyzed 30-day velocity and inventory turnover against standard retail benchmarks.`,
        recommendation: `Pause purchase orders and consider promotions for ${topCandidates.map(s => s.product.name).join(', ')}.`,
        assumptions: [
          'Coverage exceeding 45 days is classified as excess working capital lockup.',
          'Slow-moving: stock >= 25 units with 30-day sales < 6 units.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
        explanation,
        dataSource: activeSource,
        provenance: provenanceString,
      };
    }

    // =========================================================================
    // INTENT 4: SALES_SPIKE & SALES_DROP (Anomalies)
    // =========================================================================
    if (
      cleanQ.includes('spike') ||
      cleanQ.includes('drop') ||
      cleanQ.includes('surge') ||
      cleanQ.includes('slump') ||
      cleanQ.includes('anomaly') ||
      cleanQ.includes('unusual')
    ) {
      const isSpikeQuery = cleanQ.includes('spike') || cleanQ.includes('surge');
      const isDropQuery = cleanQ.includes('drop') || cleanQ.includes('slump');

      const spikes = anomalies.spikes;
      const drops = anomalies.drops;

      const numbers: CopilotMetric[] = [];
      let text = '### Today\'s Sales Anomalies vs 7-Day Baseline\n\n';

      if (spikes.length > 0 && !isDropQuery) {
        text += '**Surging Products (+30% or higher):**\n';
        spikes.forEach(s => {
          text += `- **${s.product.name}**: **${s.todaySales} units** today vs **${s.baseline} baseline** (+${s.changePct}% surge)\n`;
          numbers.push({ label: `${s.product.name} Surge`, value: `+${s.changePct}%`, context: `${s.todaySales} today vs ${s.baseline} avg` });
        });
        text += '\n';
      }

      if (drops.length > 0 && !isSpikeQuery) {
        text += '**Slumping Products (-30% or lower):**\n';
        drops.forEach(d => {
          text += `- **${d.product.name}**: **${d.todaySales} units** today vs **${d.baseline} baseline** (${d.changePct}% dip)\n`;
          numbers.push({ label: `${d.product.name} Drop`, value: `${d.changePct}%`, context: `${d.todaySales} today vs ${d.baseline} avg` });
        });
      }

      if (spikes.length === 0 && drops.length === 0) {
        text = 'No statistically significant sales anomalies (>= ±30% variance from 7-day baseline) detected in your active sales records today.';
      }

      const verifiedContext = `Data Source: ${sourceLabel}
Store Scope: ${storeName}
Spikes (+30%): ${spikes.map(s => `${s.product.name}: ${s.todaySales} today vs ${s.baseline} baseline (+${s.changePct}%)`).join(', ') || 'None'}
Drops (-30%): ${drops.map(d => `${d.product.name}: ${d.todaySales} today vs ${d.baseline} baseline (${d.changePct}%)`).join(', ') || 'None'}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || text,
        intent: spikes.length > 0 ? 'SALES_SPIKE' : 'SALES_DROP',
        numbers,
        evidence: `Compared latest daily checkout volume against prior 7-day moving average from active sales ledger.`,
        recommendation: spikes.length > 0
          ? 'Expedite shelf restocking on surging items to avoid stockouts.'
          : 'Check shelf placement and merchandising for underperforming items.',
        assumptions: [
          'Baseline reflects 7-day moving average.',
          'Anomalies require baseline >= 3 units/day.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
        dataSource: activeSource,
        provenance: provenanceString,
      };
    }

    // =========================================================================
    // INTENT 5: TOP_PRODUCTS
    // =========================================================================
    if (
      cleanQ.includes('top product') ||
      cleanQ.includes('top selling') ||
      cleanQ.includes('best selling') ||
      cleanQ.includes('highest sales')
    ) {
      const topByRevenue = [...summaries].sort((a, b) => b.revenue30d - a.revenue30d).slice(0, 5);

      const numbers: CopilotMetric[] = topByRevenue.map(s => ({
        label: s.product.name,
        value: `₹${s.revenue30d.toLocaleString('en-IN')}`,
        context: `${s.salesLast30Days} units sold (${s.avgDailySales7d}/day velocity)`,
      }));

      const listText = topByRevenue.map((s, i) =>
        `${i + 1}. **${s.product.name}** (${s.product.category})\n   - 30-Day Revenue: **₹${s.revenue30d.toLocaleString('en-IN')}**\n   - Units Sold: **${s.salesLast30Days} units**\n   - Current Stock: **${s.currentStock} units** (${s.daysRemaining} days runway)`
      ).join('\n\n');

      const verifiedContext = `Data Source: ${sourceLabel}
Top 5 Products by Revenue:
${topByRevenue.map((s, i) => `${i + 1}. ${s.product.name}: Revenue = ₹${s.revenue30d}, Units = ${s.salesLast30Days}, Stock = ${s.currentStock}`).join('\n')}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### Top Selling Products by Revenue (${storeName})\n\n${listText}`,
        intent: 'TOP_PRODUCTS',
        numbers,
        evidence: `Aggregated sales transactions across active dataset.`,
        recommendation: `Ensure prioritized replenishment and optimal shelf space for top category drivers.`,
        assumptions: ['Ranked by 30-day gross revenue from POS checkout log.'],
        confidence: 'HIGH',
        dataAvailable: true,
        dataSource: activeSource,
        provenance: provenanceString,
      };
    }

    // =========================================================================
    // INTENT 6: CATEGORY_ANALYSIS
    // =========================================================================
    if (cleanQ.includes('category') || cleanQ.includes('categories')) {
      const categoryMap = new Map<string, { revenue: number; units: number; skus: number }>();
      summaries.forEach(s => {
        const cat = s.product.category || 'General';
        const existing = categoryMap.get(cat) || { revenue: 0, units: 0, skus: 0 };
        existing.revenue += s.revenue30d;
        existing.units += s.salesLast30Days;
        existing.skus += 1;
        categoryMap.set(cat, existing);
      });

      const catList = Array.from(categoryMap.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue);

      const totalRev = catList.reduce((acc, c) => acc + c.revenue, 0);

      const numbers: CopilotMetric[] = catList.map(c => ({
        label: c.name,
        value: `₹${c.revenue.toLocaleString('en-IN')}`,
        context: `${c.units} units (${totalRev > 0 ? Math.round((c.revenue / totalRev) * 100) : 0}% share)`,
      }));

      const listText = catList.map((c, i) =>
        `${i + 1}. **${c.name}**: **₹${c.revenue.toLocaleString('en-IN')}** (${c.units} units across ${c.skus} SKUs, ${totalRev > 0 ? Math.round((c.revenue / totalRev) * 100) : 0}% of revenue)`
      ).join('\n');

      const verifiedContext = `Data Source: ${sourceLabel}
Category Performance Breakdown:
${catList.map(c => `- ${c.name}: Revenue = ₹${c.revenue}, Units = ${c.units}, SKUs = ${c.skus}`).join('\n')}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### Merchandise Category Performance Analysis\n\n${listText}`,
        intent: 'CATEGORY_ANALYSIS',
        numbers,
        evidence: `Aggregated sales transactions by category from active dataset.`,
        recommendation: `Allocate merchandising budget and prime shelf space aligned with leading categories.`,
        assumptions: ['Categories derived from product classification records.'],
        confidence: 'HIGH',
        dataAvailable: true,
        dataSource: activeSource,
        provenance: provenanceString,
      };
    }

    // =========================================================================
    // INTENT 7: STORE_PERFORMANCE / CROSS-STORE COMPARISON
    // =========================================================================
    if (
      cleanQ.includes('compare') ||
      cleanQ.includes('stores') ||
      cleanQ.includes('worst store') ||
      cleanQ.includes('best store') ||
      cleanQ.includes('biggest sales drop') ||
      cleanQ.includes('biggest drop')
    ) {
      const storeMetrics = stores.map(store => {
        const storeSales = sales.filter(s => s.storeId === store.id);
        const storeInv = inventory.filter(i => i.storeId === store.id);
        const storeKpis = AnalyticsEngine.computeDashboardKPIs(products, storeInv, storeSales, store.id);
        const storeSums = AnalyticsEngine.computeProductSummaries(products, storeInv, storeSales, store.id);
        const totalRevenue30d = storeSums.reduce((acc, c) => acc + c.revenue30d, 0);

        return {
          store,
          todayRevenue: storeKpis.todayRevenue,
          revenueChangePct: storeKpis.revenueChangePct,
          totalRevenue30d,
          stockoutCount: storeKpis.stockoutRisksCount,
          inventoryValue: storeKpis.totalInventoryValue,
        };
      });

      storeMetrics.sort((a, b) => b.totalRevenue30d - a.totalRevenue30d);

      const topStore = storeMetrics[0] || { store: { name: 'Main Store' }, revenueChangePct: 0 };
      const bottomStore = storeMetrics[storeMetrics.length - 1] || topStore;

      const numbers: CopilotMetric[] = storeMetrics.map(sm => ({
        label: sm.store.name,
        value: `₹${sm.totalRevenue30d.toLocaleString('en-IN')} (30d)`,
        context: `Today: ₹${sm.todayRevenue.toLocaleString('en-IN')}, Change: ${sm.revenueChangePct}%`,
      }));

      const listText = storeMetrics.map((sm, i) =>
        `${i + 1}. **${sm.store.name}**\n   - 30-Day Revenue: **₹${sm.totalRevenue30d.toLocaleString('en-IN')}**\n   - Today's Revenue: **₹${sm.todayRevenue.toLocaleString('en-IN')}** (${sm.revenueChangePct >= 0 ? '+' : ''}${sm.revenueChangePct}% vs yesterday)\n   - Active Stockout Risks: **${sm.stockoutCount} SKUs**`
      ).join('\n\n');

      const verifiedContext = `Data Source: ${sourceLabel}
Cross-Store Comparison:
${storeMetrics.map(sm => `- ${sm.store.name}: 30d Rev = ₹${sm.totalRevenue30d}, Today = ₹${sm.todayRevenue} (${sm.revenueChangePct}% vs yesterday), Stockouts = ${sm.stockoutCount}`).join('\n')}
Finding: Top store is ${topStore.store.name}. Lowest volume is ${bottomStore.store.name}.`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### Cross-Store Performance Comparison\n\n${listText}\n\n**Key Finding**: **${topStore.store.name}** is the top revenue generator, while **${bottomStore.store.name}** has the lowest trading volume.`,
        intent: 'STORE_PERFORMANCE',
        numbers,
        evidence: `Aggregated sales transactions across all ${stores.length} store locations in your active dataset.`,
        recommendation: `Rebalance surplus inventory from ${bottomStore.store.name} to ${topStore.store.name} to accelerate turnover.`,
        assumptions: ['Store scopes derived from store identifiers present in the dataset.'],
        confidence: 'HIGH',
        dataAvailable: true,
        dataSource: activeSource,
        provenance: provenanceString,
      };
    }

    // =========================================================================
    // INTENT 8: PRODUCT_PERFORMANCE (Specific SKU Query)
    // =========================================================================
    const matchedProduct = products.find(p =>
      cleanQ.includes(p.name.toLowerCase()) ||
      cleanQ.includes(p.sku.toLowerCase()) ||
      cleanQ.includes(p.name.split(' ')[0].toLowerCase())
    );

    if (matchedProduct) {
      const targetSummary = summaries.find(s => s.product.id === matchedProduct.id);

      if (targetSummary) {
        const p = targetSummary.product;
        const numbers: CopilotMetric[] = [
          { label: 'Current Stock', value: `${targetSummary.currentStock} units`, context: `${targetSummary.daysRemaining} days remaining` },
          { label: 'Daily Sales Velocity', value: `${targetSummary.avgDailySales7d} units/day` },
          { label: '30-Day Volume', value: `${targetSummary.salesLast30Days} units`, context: `₹${targetSummary.revenue30d.toLocaleString('en-IN')} revenue` },
          { label: 'Gross Margin', value: `${targetSummary.grossMarginPct}%`, context: `Sell ₹${p.sellingPrice} / Cost ₹${p.costPrice}` },
        ];

        const explanation = AnalyticsEngine.buildWhyExplanation(
          p,
          storeName,
          targetSummary.currentStock,
          sales,
          targetSummary.isStockoutRisk ? 'STOCK_OUT' : 'REORDER',
          selectedStoreId
        );

        const verifiedContext = `Data Source: ${sourceLabel}
Product Performance Dossier:
- Name: ${p.name}
- SKU: ${p.sku} | Category: ${p.category}
- Current Stock: ${targetSummary.currentStock} units (${targetSummary.daysRemaining} days runway)
- Daily Velocity: ${targetSummary.avgDailySales7d} units/day
- 30-Day Sales: ${targetSummary.salesLast30Days} units
- 30-Day Revenue: ₹${targetSummary.revenue30d.toLocaleString('en-IN')}
- Unit Price: ₹${p.sellingPrice} | Unit Cost: ₹${p.costPrice} | Margin: ${targetSummary.grossMarginPct}%
- Status: ${targetSummary.isStockoutRisk ? 'STOCK-OUT RISK' : targetSummary.isLowStock ? 'LOW STOCK' : 'HEALTHY'}`;

        const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

        return {
          id: `copilot-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: aiText || `### Performance Dossier: ${p.name}\n\n- **SKU**: \`${p.sku}\` | **Category**: ${p.category}\n- **Current Inventory**: **${targetSummary.currentStock} units** (${targetSummary.daysRemaining} days runway)\n- **Daily Velocity**: **${targetSummary.avgDailySales7d} units/day**\n- **30-Day Performance**: **${targetSummary.salesLast30Days} units** generated **₹${targetSummary.revenue30d.toLocaleString('en-IN')}**\n- **Reorder Status**: ${targetSummary.isStockoutRisk ? '⚠️ **CRITICAL STOCK-OUT RISK**' : targetSummary.isLowStock ? '⚡ **REORDER THRESHOLD REACHED**' : '✅ **HEALTHY INVENTORY**'}`,
          intent: 'PRODUCT_PERFORMANCE',
          numbers,
          evidence: `Retrieved historical sales ledgers and inventory positions for SKU ${p.sku} from active dataset.`,
          recommendation: targetSummary.isStockoutRisk
            ? `Place urgent purchase order for ${targetSummary.recommendedReorderQty} units immediately.`
            : `Maintain standard replenishment cycles.`,
          assumptions: [
            'Velocity calculated from verified checkout receipts.',
            'Runway = Current Stock / Daily Velocity.'
          ],
          confidence: 'HIGH',
          dataAvailable: true,
          explanation,
          dataSource: activeSource,
          provenance: provenanceString,
        };
      }
    }

    // =========================================================================
    // INTENT 9: SALES_TREND / MONTHLY SALES
    // =========================================================================
    if (
      cleanQ.includes('perform this month') ||
      cleanQ.includes('sales perform this month') ||
      cleanQ.includes('monthly sales') ||
      cleanQ.includes('sales trend') ||
      cleanQ.includes('revenue trend')
    ) {
      const totalMonthRevenue = summaries.reduce((acc, c) => acc + c.revenue30d, 0);
      const totalMonthUnits = summaries.reduce((acc, c) => acc + c.salesLast30Days, 0);
      const dailyRunRate = Math.round(totalMonthRevenue / 30);
      const top3 = [...summaries].sort((a, b) => b.revenue30d - a.revenue30d).slice(0, 3);

      const numbers: CopilotMetric[] = [
        { label: '30-Day Revenue', value: `₹${totalMonthRevenue.toLocaleString('en-IN')}` },
        { label: '30-Day Units Sold', value: `${totalMonthUnits.toLocaleString('en-IN')} units` },
        { label: 'Daily Average Run-Rate', value: `₹${dailyRunRate.toLocaleString('en-IN')}/day` },
        { label: 'Top Generating SKU', value: `${top3[0]?.product.name || 'N/A'} (₹${top3[0]?.revenue30d.toLocaleString('en-IN')})` },
      ];

      const verifiedContext = `Data Source: ${sourceLabel}
Store Scope: ${storeName}
30-Day Trading Summary:
- Total 30-Day Revenue: ₹${totalMonthRevenue.toLocaleString('en-IN')}
- Total 30-Day Units Sold: ${totalMonthUnits.toLocaleString('en-IN')} units
- Daily Average Run-Rate: ₹${dailyRunRate.toLocaleString('en-IN')}/day
- Top 3 Revenue Leaders:
${top3.map((t, i) => `  ${i + 1}. ${t.product.name}: ₹${t.revenue30d.toLocaleString('en-IN')} (${t.salesLast30Days} units)`).join('\n')}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### Monthly Sales Performance Overview (${storeName})\n\n- **30-Day Gross Revenue**: **₹${totalMonthRevenue.toLocaleString('en-IN')}**\n- **Units Checked Out**: **${totalMonthUnits.toLocaleString('en-IN')} units**\n- **Average Daily Run-Rate**: **₹${dailyRunRate.toLocaleString('en-IN')}/day**\n\n**Top Revenue Drivers This Month:**\n${top3.map((t, i) => `${i + 1}. **${t.product.name}**: ₹${t.revenue30d.toLocaleString('en-IN')} (${t.salesLast30Days} units)`).join('\n')}`,
        intent: 'SALES_TREND',
        numbers,
        evidence: `Aggregated sales transactions across ${storeName} from active dataset.`,
        recommendation: `Ensure prioritized inventory allocation for top revenue drivers (${top3.map(t => t.product.name).join(', ')}).`,
        assumptions: ['30-day window aggregated from verified checkout receipts.'],
        confidence: 'HIGH',
        dataAvailable: true,
        dataSource: activeSource,
        provenance: provenanceString,
      };
    }

    // =========================================================================
    // INTENT 10: DEFAULT EXECUTIVE HEALTH / DASHBOARD_SUMMARY
    // =========================================================================
    const verifiedContext = `Data Source: ${sourceLabel}
Executive Health Summary for ${storeName}:
- Today's Revenue: ₹${kpis.todayRevenue.toLocaleString('en-IN')} (${kpis.revenueChangePct}% vs yesterday)
- Units Sold: ${kpis.todayUnits} units
- Active Stockout Risks: ${kpis.stockoutRisksCount} SKUs
- Below Reorder Point: ${kpis.lowStockItemsCount} SKUs
- Slow Movers: ${kpis.slowMoversCount} SKUs
- Total Stock Valuation: ₹${kpis.totalInventoryValue.toLocaleString('en-IN')}`;

    const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

    return {
      id: `copilot-${Date.now()}`,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      content: aiText || `### Executive Daily Business Health (${storeName})\n\n- **Today's Revenue**: **₹${kpis.todayRevenue.toLocaleString('en-IN')}** (${kpis.revenueChangePct >= 0 ? '+' : ''}${kpis.revenueChangePct}% vs yesterday)\n- **Units Sold Today**: **${kpis.todayUnits} units**\n- **Immediate Attention Needed**: **${kpis.stockoutRisksCount} products** at stock-out risk, and **${kpis.lowStockItemsCount} items** below reorder threshold.\n- **Total Stock Valuation**: **₹${kpis.totalInventoryValue.toLocaleString('en-IN')}** across ${products.length} active SKUs.\n\nAsk me specific questions like: *"What should I reorder today?"*, *"Which products will run out in the next 3 days?"*, or *"Show me today's sales spikes."*`,
      intent: 'DASHBOARD_SUMMARY',
      numbers: [
        { label: "Today's Revenue", value: `₹${kpis.todayRevenue.toLocaleString('en-IN')}`, context: `${kpis.revenueChangePct}% vs yesterday` },
        { label: 'Units Sold', value: `${kpis.todayUnits} units` },
        { label: 'Stock-out Risks', value: `${kpis.stockoutRisksCount} SKUs` },
        { label: 'Inventory Value', value: `₹${kpis.totalInventoryValue.toLocaleString('en-IN')}` },
      ],
      evidence: `Aggregated point-of-sale transactions and inventory ledgers across ${storeName}.`,
      recommendation: `Prioritize review of the ${kpis.stockoutRisksCount} critical stockout risks in the replenishment queue.`,
      assumptions: [
        'Revenue calculated from registered sales receipts in active dataset.',
        'Inventory values calculated at unit cost prices.'
      ],
      confidence: 'HIGH',
      dataAvailable: true,
      dataSource: activeSource,
      provenance: provenanceString,
    };
  }
}
