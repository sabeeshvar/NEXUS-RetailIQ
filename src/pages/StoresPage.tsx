import React from 'react';
import { useExplain } from '../components/layout/AppLayout';
import {
  Store as StoreIcon,
  ChevronRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { AnalyticsEngine } from '../lib/analytics/engine';

export const StoresPage: React.FC = () => {
  const { retailData } = useExplain();
  const { stores, products, sales, inventory, setSelectedStoreId } = retailData;

  const storeStats = stores.map((store) => {
    const storeSales = sales.filter((s) => s.storeId === store.id);
    const storeInv = inventory.filter((i) => i.storeId === store.id);
    const kpis = AnalyticsEngine.computeDashboardKPIs(products, storeInv, storeSales, store.id);
    const sums = AnalyticsEngine.computeProductSummaries(products, storeInv, storeSales, store.id);

    const total30dRevenue = sums.reduce((acc, c) => acc + c.revenue30d, 0);
    const topProd = [...sums].sort((a, b) => b.revenue30d - a.revenue30d)[0];

    return {
      store,
      todayRevenue: kpis.todayRevenue,
      revenueChangePct: kpis.revenueChangePct,
      todayUnits: kpis.todayUnits,
      unitsChangePct: kpis.unitsChangePct,
      total30dRevenue,
      inventoryValue: kpis.totalInventoryValue,
      stockoutRisks: kpis.stockoutRisksCount,
      topProductName: topProd?.product.name || 'N/A',
    };
  });

  const chartData = storeStats.map((s) => ({
    name: s.store.name.replace(' Central', '').replace(' Market', '').replace(' Main', ''),
    todayRevenue: s.todayRevenue,
    monthRevenue: Math.round(s.total30dRevenue / 1000),
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Multi-Store Intelligence</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Comparative sales performance, inventory allocation, and branch benchmarking.
        </p>
      </div>

      {/* Comparison Chart in Neumorphic Card */}
      <div className="p-6 rounded-2xl neu-card">
        <h3 className="text-base font-bold text-white mb-1">Today's Revenue Across Stores</h3>
        <p className="text-xs text-slate-400 mb-4">Point-of-sale volume recorded today across retail branches (₹)</p>
        <div className="h-64 w-full p-2 neu-sunken rounded-xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0e17', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, "Today's Revenue"]}
              />
              <Bar dataKey="todayRevenue" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Store Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {storeStats.map((stat) => (
          <div
            key={stat.store.id}
            className="p-5 rounded-2xl neu-card flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl neu-sunken text-brand-400">
                  <StoreIcon className="w-4 h-4" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[inset_1px_1px_2px_#060910]">
                  Active Branch
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mt-3">{stat.store.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{stat.store.location}</p>

              <div className="mt-4 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 neu-sunken rounded-xl">
                  <span className="text-slate-400 font-sans">Today's Revenue:</span>
                  <span className="font-bold text-white text-sm">
                    ₹{stat.todayRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 neu-sunken rounded-xl">
                  <span className="text-slate-400 font-sans">30-Day Revenue:</span>
                  <span className="font-bold text-slate-200">
                    ₹{stat.total30dRevenue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 neu-sunken rounded-xl">
                  <span className="text-slate-400 font-sans">Stock Valuation:</span>
                  <span className="font-bold text-slate-200">
                    ₹{stat.inventoryValue.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 neu-sunken rounded-xl">
                  <span className="text-slate-400 font-sans">Stockout Risks:</span>
                  <span className={`font-bold ${stat.stockoutRisks > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {stat.stockoutRisks} SKUs
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 neu-sunken rounded-xl">
                  <span className="text-slate-400 font-sans">Top Mover:</span>
                  <span className="font-sans text-[11px] text-brand-300 font-medium truncate max-w-[140px]">
                    {stat.topProductName}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedStoreId(stat.store.id)}
              className="neu-btn mt-5 w-full py-2.5 px-3 rounded-xl text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Scope Dashboard to This Store</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
