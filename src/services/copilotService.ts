import { CopilotMessage, CopilotIntent, CopilotMetric, WhyExplanation } from '../types';
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
  } catch (err) {
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
      contents: `You are RetailIQ Copilot, an AI retail operations assistant for a store manager.
MANDATORY OPERATIONAL RULES:
1. You MUST NEVER fabricate or invent business numbers.
2. Quote and use ONLY the verified figures provided in the verified data context below.
3. If the user asks for data outside this context, say: "I do not have enough data to answer that reliably."
4. Structure your response with clean markdown:
   - Direct concise executive answer
   - Bullet list of verified SKU numbers & metrics
   - Actionable recommendation

Manager Question: "${prompt}"

Verified Ground Truth POS Data:
${verifiedContext}`,
    });

    return response.text || null;
  } catch (err: any) {
    console.warn('[RetailIQ Copilot] Gemini client error (using deterministic template):', err.message);
    return null;
  }
}

export class CopilotService {
  /**
   * Process a manager's natural language question with strict Firestore grounding
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

    // 1. INSUFFICIENT DATA: Out-of-bounds dates or unrecorded dimensions
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

    // 2. Compute deterministic scoped analytics from Firestore/ledger
    const summaries = AnalyticsEngine.computeProductSummaries(products, inventory, sales, selectedStoreId);
    const anomalies = AnalyticsEngine.detectSalesAnomalies(products, sales, selectedStoreId);

    // Intent 1: STOCK_OUT / RUN OUT IN 3 DAYS
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
        value: `${c.currentStock} units (${c.daysRemaining} days remaining)`,
        context: `Daily sales: ${c.avgDailySales7d}/day, Reorder needed: ${c.recommendedReorderQty} units`,
      }));

      const primary = urgent3d[0] || summaries[0];
      const explanation = AnalyticsEngine.buildWhyExplanation(
        primary.product,
        storeName,
        primary.currentStock,
        sales,
        'STOCK_OUT',
        selectedStoreId
      );

      const listText = urgent3d.length > 0
        ? urgent3d.map((c, i) =>
            `${i + 1}. **${c.product.name}**\n   - Current Stock: **${c.currentStock} units**\n   - Daily Sales Velocity: **${c.avgDailySales7d} units/day**\n   - Projected Runway: **${c.daysRemaining} days**\n   - Reorder Point: **${c.reorderPoint} units**\n   - Recommended Action: **Reorder ${c.recommendedReorderQty} units**`
          ).join('\n\n')
        : 'No products are projected to deplete within the next 3 days based on trailing 7-day velocity.';

      const verifiedContext = `Store Scope: ${storeName}
Products Depleting in <= 3 Days:
${urgent3d.map(c => `- ${c.product.name}: Stock = ${c.currentStock} units, 7d Daily Velocity = ${c.avgDailySales7d}/day, Days Remaining = ${c.daysRemaining} days, Reorder Point = ${c.reorderPoint}, Recommended Reorder = ${c.recommendedReorderQty} units`).join('\n')}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### ${urgent3d.length} products will run out in the next 3 days\n\n${listText}`,
        intent: 'STOCK_OUT',
        numbers,
        evidence: `Analyzed POS inventory ledger and 7-day sales velocity across ${storeName}.`,
        recommendation: urgent3d.length > 0
          ? `Place urgent purchase orders for ${urgent3d.map(c => c.product.name).join(', ')} before stock depletes below lead time thresholds.`
          : 'Continue standard inventory monitoring.',
        assumptions: [
          'Demand velocity projected using 7-day moving average.',
          'Supplier lead times and safety stocks derived from product master catalog.',
          'Days Remaining = Current Stock / Average Daily Sales.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
        explanation,
      };
    }

    // Intent 2: REORDER / GENERAL STOCK-OUT
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

      const primary = topCandidates[0] || summaries[0];
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

      const verifiedContext = `Store Scope: ${storeName}
Products Needing Replenishment:
${topCandidates.map(c => `- ${c.product.name}: Stock = ${c.currentStock} units, 7d Velocity = ${c.avgDailySales7d}/day, Days Remaining = ${c.daysRemaining}d, Reorder Point = ${c.reorderPoint}, Recommended Order = ${c.recommendedReorderQty} units, Lead Time = ${c.product.leadTimeDays}d`).join('\n')}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### ${topCandidates.length} products require replenishment today\n\n${listText}`,
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

    // Intent 3: SLOW_MOVING / OVERSTOCK
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

      const topCandidates = candidates.slice(0, 4);
      const primary = topCandidates[0] || summaries[0];

      const numbers: CopilotMetric[] = topCandidates.map(s => ({
        label: s.product.name,
        value: `${s.currentStock} units in stock (${s.stockCoverageDays} days coverage)`,
        context: `30-day sales: ${s.salesLast30Days} units, Value: ₹${s.inventoryValue.toLocaleString('en-IN')}`,
      }));

      const explanation: WhyExplanation = AnalyticsEngine.buildWhyExplanation(
        primary.product,
        storeName,
        primary.currentStock,
        sales,
        isOverstockQuery ? 'OVERSTOCK' : 'SLOW_MOVING',
        selectedStoreId
      );

      const listText = topCandidates.map((s, i) =>
        `${i + 1}. **${s.product.name}** (${s.product.category})\n   - Current Stock: **${s.currentStock} units**\n   - 30-Day Sales: **${s.salesLast30Days} units**\n   - Estimated Coverage: **${s.stockCoverageDays} days**\n   - Capital Tied Up: **₹${s.inventoryValue.toLocaleString('en-IN')}**\n   - Suggested Action: **${isOverstockQuery ? 'Pause future purchase orders' : 'Bundle with fast-moving items or apply clearance promo'}**`
      ).join('\n\n');

      const verifiedContext = `Store Scope: ${storeName}
${isOverstockQuery ? 'Overstocked SKUs' : 'Slow-Moving SKUs'}:
${topCandidates.map(s => `- ${s.product.name}: Stock = ${s.currentStock} units, 30d Sales = ${s.salesLast30Days} units, Coverage = ${s.stockCoverageDays} days, Tied Capital = ₹${s.inventoryValue}`).join('\n')}`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### Detected ${topCandidates.length} ${isOverstockQuery ? 'overstocked' : 'slow-moving'} items\n\n${listText}`,
        intent: isOverstockQuery ? 'OVERSTOCK' : 'SLOW_MOVING',
        numbers,
        evidence: `Evaluated 30-day sales velocity and stock coverage against standard retail benchmarks.`,
        recommendation: `Pause automated replenishment for ${topCandidates.map(s => s.product.name).join(', ')} and rebalance inventory across higher-turnover stores.`,
        assumptions: [
          'Coverage exceeding 45 days is classified as excess working capital lockup.',
          'Slow-moving threshold: stock >= 25 units with 30-day sales < 6 units.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
        explanation,
      };
    }

    // Intent 4: SALES SPIKES & DROPS
    if (
      cleanQ.includes('spike') ||
      cleanQ.includes('drop') ||
      cleanQ.includes('unusual') ||
      cleanQ.includes('surge') ||
      cleanQ.includes('anomaly')
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
          numbers.push({ label: `${s.product.name} Surge`, value: `+${s.changePct}%`, context: `${s.todaySales} vs ${s.baseline} avg` });
        });
        text += '\n';
      }

      if (drops.length > 0 && !isSpikeQuery) {
        text += '**Slumping Products (-30% or lower):**\n';
        drops.forEach(d => {
          text += `- **${d.product.name}**: **${d.todaySales} units** today vs **${d.baseline} baseline** (${d.changePct}% dip)\n`;
          numbers.push({ label: `${d.product.name} Drop`, value: `${d.changePct}%`, context: `${d.todaySales} vs ${d.baseline} avg` });
        });
      }

      const primary = spikes[0] || drops[0] || summaries[0];
      const explanation: WhyExplanation = AnalyticsEngine.buildWhyExplanation(
        primary.product,
        storeName,
        summaries.find(s => s.product.id === primary.product.id)?.currentStock || 30,
        sales,
        spikes[0] ? 'SALES_SPIKE' : 'SALES_DROP',
        selectedStoreId
      );

      const verifiedContext = `Store Scope: ${storeName}
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

    // Intent 5: MONTHLY SALES PERFORMANCE / SALES TREND
    if (
      cleanQ.includes('perform this month') ||
      cleanQ.includes('sales perform this month') ||
      cleanQ.includes('monthly sales') ||
      cleanQ.includes('sales trend')
    ) {
      const totalMonthRevenue = summaries.reduce((acc, c) => acc + c.revenue30d, 0);
      const totalMonthUnits = summaries.reduce((acc, c) => acc + c.salesLast30Days, 0);
      const dailyRunRate = Math.round(totalMonthRevenue / 30);
      const top3 = [...summaries].sort((a, b) => b.revenue30d - a.revenue30d).slice(0, 3);

      const numbers: CopilotMetric[] = [
        { label: '30-Day Revenue', value: `₹${totalMonthRevenue.toLocaleString('en-IN')}` },
        { label: '30-Day Units Sold', value: `${totalMonthUnits.toLocaleString('en-IN')} units` },
        { label: 'Average Daily Run-Rate', value: `₹${dailyRunRate.toLocaleString('en-IN')}/day` },
        { label: 'Top Generating SKU', value: `${top3[0]?.product.name || 'N/A'} (₹${top3[0]?.revenue30d.toLocaleString('en-IN')})` },
      ];

      const verifiedContext = `Store Scope: ${storeName}
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
        evidence: `Aggregated trailing 30-day POS checkout records across ${storeName}.`,
        recommendation: `Ensure high-velocity inventory allocation for top category leaders (${top3.map(t => t.product.name).join(', ')}).`,
        assumptions: ['30-day window derived from verified checkout receipts.'],
        confidence: 'HIGH',
        dataAvailable: true,
      };
    }

    // Intent 6: STORE COMPARISON ("Which store had the biggest sales drop?", "Compare all stores")
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
        context: `30d Rev: ₹${sm.totalRevenue30d.toLocaleString('en-IN')}, Change: ${sm.revenueChangePct}%`,
      }));

      const topStore = storeMetrics[0];
      const bottomStore = storeMetrics[storeMetrics.length - 1];

      const listText = storeMetrics.map((sm, i) =>
        `${i + 1}. **${sm.store.name}**\n   - Today's Revenue: **₹${sm.todayRevenue.toLocaleString('en-IN')}** (${sm.revenueChangePct >= 0 ? '+' : ''}${sm.revenueChangePct}% vs yesterday)\n   - 30-Day Revenue: **₹${sm.totalRevenue30d.toLocaleString('en-IN')}**\n   - Active Stockout Risks: **${sm.stockoutCount} SKUs**\n   - Stock Valuation: **₹${sm.inventoryValue.toLocaleString('en-IN')}**`
      ).join('\n\n');

      const verifiedContext = `Cross-Store Comparison:
${storeMetrics.map(sm => `- ${sm.store.name}: Today = ₹${sm.todayRevenue} (${sm.revenueChangePct}% vs yesterday), 30d Rev = ₹${sm.totalRevenue30d}, Stockouts = ${sm.stockoutCount}`).join('\n')}
Summary: Top performing branch is ${topStore.store.name}. Lowest volume / biggest slump is ${bottomStore.store.name}.`;

      const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

      return {
        id: `copilot-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: aiText || `### Cross-Store Performance Comparison\n\n${listText}\n\n**Key Finding**: **${topStore.store.name}** is generating the highest revenue, while **${bottomStore.store.name}** is trailing in volume (${bottomStore.revenueChangePct}% vs yesterday).`,
        intent: 'STORE_PERFORMANCE',
        numbers,
        evidence: `Aggregated POS transactions and inventory ledgers across all ${stores.length} retail locations.`,
        recommendation: `Consider reallocating slow-moving inventory from ${bottomStore.store.name} to ${topStore.store.name} to accelerate inventory turnover.`,
        assumptions: [
          'Store comparisons reflect identical product catalog availability.',
          'Revenue figures are net of any registered returns.'
        ],
        confidence: 'HIGH',
        dataAvailable: true,
      };
    }

    // Intent 7: PRODUCT PERFORMANCE (Specific SKU Query)
    const matchedProduct = products.find(p =>
      cleanQ.includes(p.name.toLowerCase()) ||
      cleanQ.includes(p.sku.toLowerCase()) ||
      cleanQ.includes(p.name.split(' ')[0].toLowerCase())
    );

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

        const verifiedContext = `Product Performance Dossier:
- Name: ${p.name}
- SKU: ${p.sku} | Category: ${p.category} | Supplier: ${p.supplier}
- Current Stock: ${targetSummary.currentStock} units
- Runway: ${targetSummary.daysRemaining} days
- 7-Day Velocity: ${targetSummary.avgDailySales7d} units/day
- Today's Sales: ${targetSummary.salesToday} units
- 30-Day Sales: ${targetSummary.salesLast30Days} units
- 30-Day Revenue: ₹${targetSummary.revenue30d.toLocaleString('en-IN')}
- Gross Margin: ${targetSummary.grossMarginPct}% (Cost ₹${p.costPrice} / Sell ₹${p.sellingPrice})
- Status: ${targetSummary.isStockoutRisk ? 'STOCK-OUT RISK' : targetSummary.isLowStock ? 'LOW STOCK' : 'HEALTHY'}`;

        const aiText = await callGemini(question, verifiedContext, options?.userApiKey);

        return {
          id: `copilot-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: aiText || `### Performance Dossier: ${p.name}\n\n- **SKU**: \`${p.sku}\` | **Category**: ${p.category} | **Supplier**: ${p.supplier}\n- **Current Inventory**: **${targetSummary.currentStock} units** (${targetSummary.daysRemaining} days of sales remaining)\n- **Recent Velocity**: **${targetSummary.avgDailySales7d} units/day** (7d avg) | **${targetSummary.salesToday} units sold today**\n- **30-Day Performance**: **${targetSummary.salesLast30Days} units** generated **₹${targetSummary.revenue30d.toLocaleString('en-IN')}**\n- **Unit Economics**: Selling Price: **₹${p.sellingPrice}**, Cost: **₹${p.costPrice}**, Estimated Gross Margin: **${targetSummary.grossMarginPct}%**\n- **Reorder Status**: ${targetSummary.isStockoutRisk ? '⚠️ **CRITICAL STOCK-OUT RISK**' : targetSummary.isLowStock ? '⚡ **REORDER POINT REACHED**' : '✅ **HEALTHY INVENTORY**'}`,
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

    // Default: General Dashboard / Executive Health
    const kpis = AnalyticsEngine.computeDashboardKPIs(products, inventory, sales, selectedStoreId);

    const verifiedContext = `Executive Health Summary for ${storeName}:
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
      content: aiText || `### Executive Daily Business Health (${storeName})\n\n- **Today's Revenue**: **₹${kpis.todayRevenue.toLocaleString('en-IN')}** (${kpis.revenueChangePct >= 0 ? '+' : ''}${kpis.revenueChangePct}% vs yesterday)\n- **Units Sold**: **${kpis.todayUnits} units**\n- **Immediate Attention Needed**: **${kpis.stockoutRisksCount} products** at stock-out risk, and **${kpis.lowStockItemsCount} items** below reorder point.\n- **Total Stock Valuation**: **₹${kpis.totalInventoryValue.toLocaleString('en-IN')}** across ${products.length} active SKUs.\n\nAsk me specific questions like: *"What should I reorder today?"*, *"Which products will run out in the next 3 days?"*, or *"Show me today's sales spikes."*`,
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
