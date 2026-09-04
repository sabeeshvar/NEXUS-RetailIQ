import React, { useState } from 'react';
import { useExplain } from '../components/layout/AppLayout';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  HelpCircle,
  Search,
} from 'lucide-react';
import { AnalyticsEngine } from '../lib/analytics/engine';

export const ProductsPage: React.FC = () => {
  const { retailData, openWhy } = useExplain();
  const { summaries, sales, stores, selectedStoreId } = retailData;
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  const currentStoreName = selectedStoreId !== 'all'
    ? stores.find(s => s.id === selectedStoreId)?.name || 'Selected Store'
    : 'All Stores';

  const filtered = summaries.filter((s) => {
    const matchesSearch =
      s.product.name.toLowerCase().includes(search.toLowerCase()) ||
      s.product.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'all' || s.product.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  const categories = Array.from(new Set(summaries.map((s) => s.product.category)));

  const handleAskCopilot = () => {
    navigate('/copilot');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Product Catalog & Economics</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Unit cost, margin profiles, and inventory velocity for every product SKU.
          </p>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or SKU..."
              className="neu-sunken rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="neu-sunken rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#0e1420]">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c} className="bg-[#0e1420]">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((s) => {
          const p = s.product;

          const handleWhy = () => {
            const expl = AnalyticsEngine.buildWhyExplanation(
              p,
              currentStoreName,
              s.currentStock,
              sales,
              s.isStockoutRisk ? 'STOCK_OUT' : s.isLowStock ? 'REORDER' : 'REORDER',
              selectedStoreId !== 'all' ? selectedStoreId : undefined
            );
            openWhy(expl);
          };

          return (
            <div
              key={p.id}
              className="p-5 rounded-2xl neu-card flex flex-col justify-between"
            >
              <div>
                {/* Header: SKU & Category */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono text-slate-400 font-semibold">{p.sku}</span>
                  <span className="px-2.5 py-0.5 rounded-full neu-sunken-sm text-slate-300 font-medium border border-slate-800">
                    {p.category}
                  </span>
                </div>

                {/* Product Name */}
                <h3 className="text-base font-bold text-white mt-2 leading-snug">{p.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Supplier: {p.supplier}</p>

                {/* Economics Strip */}
                <div className="mt-3 p-3 neu-sunken rounded-xl grid grid-cols-3 gap-2 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans">Price</span>
                    <div className="text-xs font-bold text-white mt-0.5">₹{p.sellingPrice}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans">Cost</span>
                    <div className="text-xs font-bold text-slate-300 mt-0.5">₹{p.costPrice}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-sans">Margin</span>
                    <div className="text-xs font-bold text-emerald-400 mt-0.5">{s.grossMarginPct}%</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Current Stock:</span>
                    <span className="font-mono font-bold text-white">{s.currentStock} units</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">7-Day Sales Velocity:</span>
                    <span className="font-mono font-bold text-white">{s.avgDailySales7d} units/day</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">30-Day Revenue:</span>
                    <span className="font-mono font-bold text-white">₹{s.revenue30d.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">Inventory Runway:</span>
                    <span
                      className={`font-mono font-bold ${
                        s.daysRemaining <= 2.5 ? 'text-rose-400' : 'text-slate-200'
                      }`}
                    >
                      {s.daysRemaining > 300 ? '300+ days' : `${s.daysRemaining} days`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={handleWhy}
                  className="neu-btn inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-brand-400" />
                  <span>Why?</span>
                </button>

                <button
                  onClick={handleAskCopilot}
                  className="neu-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-brand-300 text-xs font-semibold cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  <span>Ask Copilot</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
