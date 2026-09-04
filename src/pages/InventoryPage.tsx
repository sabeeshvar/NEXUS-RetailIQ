import React, { useState, useMemo } from 'react';
import { useExplain } from '../components/layout/AppLayout';
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  HelpCircle,
  Search,
  Layers,
} from 'lucide-react';
import { AnalyticsEngine } from '../lib/analytics/engine';

export const InventoryPage: React.FC = () => {
  const { retailData, openWhy } = useExplain();
  const { summaries, stores, sales, selectedStoreId } = retailData;

  const [activeTab, setActiveTab] = useState<'ALL' | 'STOCKOUT' | 'LOW' | 'OVERSTOCK' | 'SLOW'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const currentStoreName = selectedStoreId !== 'all'
    ? stores.find(s => s.id === selectedStoreId)?.name || 'Selected Store'
    : 'All Stores';

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    let list = summaries;

    // Tab filtering
    if (activeTab === 'STOCKOUT') {
      list = list.filter((s) => s.isStockoutRisk);
    } else if (activeTab === 'LOW') {
      list = list.filter((s) => s.isLowStock);
    } else if (activeTab === 'OVERSTOCK') {
      list = list.filter((s) => s.isOverstocked);
    } else if (activeTab === 'SLOW') {
      list = list.filter((s) => s.isSlowMoving);
    }

    // Search filtering
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.product.name.toLowerCase().includes(q) ||
          s.product.sku.toLowerCase().includes(q) ||
          s.product.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [summaries, activeTab, searchTerm]);

  // High-level aggregates
  const totalValuation = summaries.reduce((acc, curr) => acc + curr.inventoryValue, 0);
  const stockoutCount = summaries.filter((s) => s.isStockoutRisk).length;
  const lowCount = summaries.filter((s) => s.isLowStock).length;
  const overstockCount = summaries.filter((s) => s.isOverstocked).length;
  const slowCount = summaries.filter((s) => s.isSlowMoving).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Inventory Intelligence</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamic runway estimation, reorder triggers, and working capital optimization across SKUs.
          </p>
        </div>

        {/* Global Stock Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 neu-card rounded-xl text-right font-mono">
            <span className="text-[10px] text-slate-500 uppercase font-sans">Total Stock Value</span>
            <div className="text-base font-bold text-white">₹{totalValuation.toLocaleString('en-IN')}</div>
          </div>
          <div className="px-4 py-2 neu-card rounded-xl text-right font-mono">
            <span className="text-[10px] text-slate-500 uppercase font-sans">Tracked SKUs</span>
            <div className="text-base font-bold text-brand-400">{summaries.length} Items</div>
          </div>
        </div>
      </div>

      {/* Segment Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Neumorphic Filter Tabs */}
        <div className="flex flex-wrap neu-sunken rounded-2xl p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'neu-btn-brand text-white'
                : 'neu-btn text-slate-400 hover:text-white'
            }`}
          >
            All SKUs ({summaries.length})
          </button>
          <button
            onClick={() => setActiveTab('STOCKOUT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'STOCKOUT'
                ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'neu-btn text-rose-400 hover:text-rose-300'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Stock-out Risk ({stockoutCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('LOW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'LOW'
                ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'neu-btn text-amber-400 hover:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock ({lowCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('OVERSTOCK')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'OVERSTOCK'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                : 'neu-btn text-blue-400 hover:text-blue-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Overstock ({overstockCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('SLOW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SLOW'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                : 'neu-btn text-purple-400 hover:text-purple-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Slow-Moving ({slowCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search SKU or name..."
            className="w-full neu-sunken rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Inventory Table in Neumorphic Card */}
      <div className="rounded-2xl neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0e17] border-b border-slate-800/80 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product & Category</th>
                <th className="py-3 px-3">SKU</th>
                <th className="py-3 px-3 text-right">Current Stock</th>
                <th className="py-3 px-3 text-right">7d Velocity</th>
                <th className="py-3 px-3 text-right">Days Remaining</th>
                <th className="py-3 px-3 text-right">Reorder Point</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-left">Recommended Action</th>
                <th className="py-3 px-3 text-center">Explain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 font-sans">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    No products matched the selected filters.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((s) => {
                  const p = s.product;
                  const isStockout = s.isStockoutRisk;
                  const isLow = s.isLowStock;
                  const isOver = s.isOverstocked;
                  const isSlow = s.isSlowMoving;

                  const handleWhy = () => {
                    const expl = AnalyticsEngine.buildWhyExplanation(
                      p,
                      currentStoreName,
                      s.currentStock,
                      sales,
                      isStockout ? 'STOCK_OUT' : isLow ? 'REORDER' : isOver ? 'OVERSTOCK' : isSlow ? 'SLOW_MOVING' : 'REORDER',
                      selectedStoreId !== 'all' ? selectedStoreId : undefined
                    );
                    openWhy(expl);
                  };

                  return (
                    <tr key={p.id} className="hover:bg-[#111827]/40 transition-colors">
                      {/* Product Name & Category */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400">{p.category} • Supplier: {p.supplier}</div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-3 font-mono text-slate-300">{p.sku}</td>

                      {/* Current Stock */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {s.currentStock}
                        <span className="text-[10px] text-slate-500 font-sans ml-1">units</span>
                      </td>

                      {/* 7d Velocity */}
                      <td className="py-3 px-3 text-right font-mono text-slate-200">
                        {s.avgDailySales7d}
                        <span className="text-[10px] text-slate-500 font-sans ml-1">/day</span>
                      </td>

                      {/* Days Remaining Runway */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`font-bold ${
                            s.daysRemaining <= 2.5
                              ? 'text-rose-400 font-extrabold'
                              : s.daysRemaining <= 6
                              ? 'text-amber-300'
                              : 'text-emerald-400'
                          }`}
                        >
                          {s.daysRemaining > 300 ? '300+d' : `${s.daysRemaining}d`}
                        </span>
                      </td>

                      {/* Reorder Point */}
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {s.reorderPoint}
                      </td>

                      {/* Operational Status Tag */}
                      <td className="py-3 px-3 text-center">
                        {isStockout ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-[inset_1px_1px_2px_#060910]">
                            Stockout Risk
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[inset_1px_1px_2px_#060910]">
                            Low Stock
                          </span>
                        ) : isOver ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 shadow-[inset_1px_1px_2px_#060910]">
                            Overstocked
                          </span>
                        ) : isSlow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[inset_1px_1px_2px_#060910]">
                            Slow Mover
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[inset_1px_1px_2px_#060910]">
                            Healthy
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-slate-300 text-[11px] leading-snug">
                        {s.recommendedReorderQty > 0 ? (
                          <span className="font-semibold text-brand-300">
                            Reorder {s.recommendedReorderQty} units
                          </span>
                        ) : isOver ? (
                          <span className="text-blue-300">Pause orders / Promo</span>
                        ) : isSlow ? (
                          <span className="text-purple-300">Bundle / Price discount</span>
                        ) : (
                          <span className="text-slate-500">Monitor runway</span>
                        )}
                      </td>

                      {/* "Why?" Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={handleWhy}
                          className="neu-btn inline-flex items-center gap-1 text-[11px] font-bold text-brand-400 hover:text-brand-300 px-2.5 py-1 rounded-xl cursor-pointer"
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>Why?</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
