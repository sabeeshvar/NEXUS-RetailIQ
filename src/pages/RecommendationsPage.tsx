import React, { useState } from 'react';
import { useExplain } from '../components/layout/AppLayout';
import {
  Sparkles,
  RotateCcw,
  Layers,
  TrendingUp,
  TrendingDown,
  Truck,
  PauseCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AnalyticsEngine } from '../lib/analytics/engine';

export const RecommendationsPage: React.FC = () => {
  const { retailData, openWhy } = useExplain();
  const { summaries, anomalies, stores, sales, selectedStoreId } = retailData;

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'REORDER' | 'OVERSTOCK' | 'SPIKE' | 'DROP'>('ALL');

  const currentStoreName = selectedStoreId !== 'all'
    ? stores.find(s => s.id === selectedStoreId)?.name || 'Selected Store'
    : 'All Stores';

  // Build structured actionable recommendations from deterministic logic
  const reorders = summaries
    .filter((s) => s.isStockoutRisk || s.isLowStock)
    .map((s) => ({
      id: `rec-reorder-${s.product.id}`,
      type: 'REORDER',
      product: s.product,
      currentStock: s.currentStock,
      title: `Generate Replenishment Order: ${s.product.name}`,
      problem: `Current inventory of ${s.currentStock} units will deplete in ${s.daysRemaining} days (runway < lead time of ${s.product.leadTimeDays}d).`,
      evidence: `7-day moving average velocity is ${s.avgDailySales7d} units/day. Reorder threshold is ${s.reorderPoint} units.`,
      action: `Issue Purchase Order for ${s.recommendedReorderQty} units to supplier '${s.product.supplier}'.`,
      expectedPurpose: 'Prevent out-of-stock revenue loss and protect customer retention.',
      assumptions: [
        'Supplier delivery lead time remains strictly within contract agreement.',
        'Average daily sales remain consistent with trailing 7-day volume.',
      ],
      tag: 'Critical Replenishment',
    }));

  const overstocks = summaries
    .filter((s) => s.isOverstocked || s.isSlowMoving)
    .map((s) => ({
      id: `rec-overstock-${s.product.id}`,
      type: 'OVERSTOCK',
      product: s.product,
      currentStock: s.currentStock,
      title: `Mitigate Excess Holding: ${s.product.name}`,
      problem: `Holding ${s.currentStock} units representing ${s.stockCoverageDays} days of forward coverage. ₹${s.inventoryValue.toLocaleString('en-IN')} locked in working capital.`,
      evidence: `30-day volume is only ${s.salesLast30Days} units. Benchmark threshold is 45 days.`,
      action: s.isSlowMoving
        ? 'Create promotional product bundle with fast-moving category companion or apply a 10% volume discount.'
        : 'Freeze recurring purchase orders and reallocate surplus to high-demand branch locations.',
      expectedPurpose: 'Free locked working capital and optimize shelf rotation efficiency.',
      assumptions: [
        'Carrying cost estimated at standard industry warehousing rates.',
        'No upcoming seasonal promotional campaign scheduled for this specific SKU.',
      ],
      tag: 'Capital Optimization',
    }));

  const spikes = anomalies.spikes.map((sp) => ({
    id: `rec-spike-${sp.product.id}`,
    type: 'SPIKE',
    product: sp.product,
    currentStock: summaries.find((s) => s.product.id === sp.product.id)?.currentStock || 25,
    title: `Capitalize on Demand Surge: ${sp.product.name}`,
    problem: `Sales velocity spiked by +${sp.changePct}% today (${sp.todaySales} units sold vs ${sp.baseline} baseline).`,
    evidence: `Sudden acceleration from 7-day average baseline. Shelf stock may exhaust before standard cycle.`,
    action: 'Accelerate stock replenishment from backroom reserves to front displays immediately.',
    expectedPurpose: 'Sustain peak checkout conversions without suffering midday shelf stockouts.',
    assumptions: [
      'Surge represents actual end-consumer demand rather than a one-off wholesale return.',
    ],
    tag: 'Demand Surge',
  }));

  const drops = anomalies.drops.map((dr) => ({
    id: `rec-drop-${dr.product.id}`,
    type: 'DROP',
    product: dr.product,
    currentStock: summaries.find((s) => s.product.id === dr.product.id)?.currentStock || 25,
    title: `Investigate Sales Slump: ${dr.product.name}`,
    problem: `Sales dropped by ${dr.changePct}% today (${dr.todaySales} units sold vs ${dr.baseline} baseline).`,
    evidence: `Significant deviation from normal 7-day sales velocity.`,
    action: 'Verify physical shelf placement, check for missing shelf tags/prices, and inspect competing brand promotions.',
    expectedPurpose: 'Identify display issues or pricing friction before revenue loss compounds.',
    assumptions: [
      'POS terminals accurately recorded all customer transactions.',
    ],
    tag: 'Demand Slump',
  }));

  const allRecommendations = [...reorders, ...overstocks, ...spikes, ...drops];

  const filtered = allRecommendations.filter((r) => {
    if (categoryFilter === 'ALL') return true;
    return r.type === categoryFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Recommended Actions</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Prescriptive retail decisions generated with deterministic calculations, thresholds, and transparent assumptions.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-surface-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              categoryFilter === 'ALL' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({allRecommendations.length})
          </button>
          <button
            onClick={() => setCategoryFilter('REORDER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              categoryFilter === 'REORDER' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Reorder ({reorders.length})
          </button>
          <button
            onClick={() => setCategoryFilter('OVERSTOCK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              categoryFilter === 'OVERSTOCK' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Reduce Stock ({overstocks.length})
          </button>
          <button
            onClick={() => setCategoryFilter('SPIKE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              categoryFilter === 'SPIKE' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Spikes ({spikes.length})
          </button>
          <button
            onClick={() => setCategoryFilter('DROP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              categoryFilter === 'DROP' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Drops ({drops.length})
          </button>
        </div>
      </div>

      {/* Recommendations Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map((rec) => {
          const handleWhy = () => {
            const expl = AnalyticsEngine.buildWhyExplanation(
              rec.product,
              currentStoreName,
              rec.currentStock,
              sales,
              rec.type === 'REORDER' ? 'REORDER' : rec.type === 'OVERSTOCK' ? 'OVERSTOCK' : rec.type === 'SPIKE' ? 'SALES_SPIKE' : 'SALES_DROP',
              selectedStoreId !== 'all' ? selectedStoreId : undefined
            );
            openWhy(expl);
          };

          return (
            <div
              key={rec.id}
              className="p-6 rounded-2xl bg-surface-900 border border-slate-800 hover:border-brand-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-300 border border-brand-500/30">
                    {rec.tag}
                  </span>
                  <span className="text-xs text-slate-400">{currentStoreName}</span>
                </div>

                <h3 className="text-base font-bold text-white mt-2.5 leading-snug">{rec.title}</h3>

                {/* Problem & Evidence */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className="p-2.5 bg-surface-950 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 font-semibold block mb-0.5">Identified Problem:</span>
                    <span className="text-slate-200">{rec.problem}</span>
                  </div>

                  <div className="p-2.5 bg-surface-950 rounded-xl border border-slate-800/80">
                    <span className="text-slate-400 font-semibold block mb-0.5">Empirical Evidence:</span>
                    <span className="text-slate-200">{rec.evidence}</span>
                  </div>

                  <div className="p-3 bg-brand-950/40 rounded-xl border border-brand-800/50">
                    <span className="text-brand-300 font-bold block mb-0.5">Prescribed Action:</span>
                    <span className="text-white font-medium">{rec.action}</span>
                  </div>
                </div>

                {/* Assumptions */}
                <div className="mt-3 text-[11px] text-slate-400">
                  <strong className="text-slate-300">Underlying Assumptions:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {rec.assumptions.map((asmp, i) => (
                      <li key={i}>{asmp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button & "Why?" */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={handleWhy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-500/30 transition-all cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why this action?</span>
                </button>

                <span className="text-[11px] text-emerald-400 font-medium">
                  Expected: {rec.expectedPurpose}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
