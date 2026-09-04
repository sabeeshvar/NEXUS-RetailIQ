import React from 'react';
import { useExplain } from '../components/layout/AppLayout';
import {
  TrendingUp,
  Boxes,
  AlertOctagon,
  AlertTriangle,
  Clock,
  Bell,
  HelpCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  Database,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { AnalyticsEngine } from '../lib/analytics/engine';

export const DashboardPage: React.FC = () => {
  const { retailData, openWhy } = useExplain();
  const { kpis, alerts, summaries, sales, stores, selectedStoreId, hasData, loadDemo, isLoading } = retailData;

  const currentStoreName = selectedStoreId !== 'all'
    ? stores.find(s => s.id === selectedStoreId)?.name || 'Selected Store'
    : 'All Stores';

  // Empty state handling
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 neu-card-lg max-w-xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-[#111827] shadow-[6px_6px_14px_#060910,-6px_-6px_14px_#182338] flex items-center justify-center text-brand-400 mb-4 border border-brand-500/20">
          <Database className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">No Retail Data Loaded Yet</h2>
        <p className="text-slate-400 max-w-md mt-2 text-sm">
          Load our realistic Indian retail demo dataset (3 stores, 24 products, 90 days of transactions) to evaluate stockout predictions, anomaly detection, and AI Copilot.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <button
            onClick={loadDemo}
            disabled={isLoading}
            className="neu-btn-brand px-6 py-3 rounded-xl font-bold text-sm cursor-pointer"
          >
            {isLoading ? 'Generating 90-Day Records...' : 'Load Demo Data (Instant)'}
          </button>
          <Link
            to="/import"
            className="neu-btn px-6 py-3 rounded-xl text-slate-200 font-semibold text-sm"
          >
            Import Custom CSV
          </Link>
        </div>
      </div>
    );
  }

  // Priority Attention Items (Stockouts first, then drops/spikes)
  const attentionAlerts = alerts.slice(0, 6);

  // Prepare 7-day revenue trend chart data
  const last7DaysSales: { date: string; revenue: number; units: number }[] = [];
  const dateMap = new Map<string, { revenue: number; units: number }>();

  sales.forEach(s => {
    const existing = dateMap.get(s.date) || { revenue: 0, units: 0 };
    dateMap.set(s.date, {
      revenue: existing.revenue + s.revenue,
      units: existing.units + s.quantity,
    });
  });

  const sortedDates = Array.from(dateMap.keys()).sort().slice(-7);
  sortedDates.forEach(d => {
    const data = dateMap.get(d)!;
    last7DaysSales.push({
      date: d.slice(5), // MM-DD
      revenue: data.revenue,
      units: data.units,
    });
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Operational Status: {currentStoreName}
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">Good morning, Manager</h1>
          <p className="text-slate-400 text-sm mt-0.5">Here is what needs your attention today.</p>
        </div>

        <Link
          to="/copilot"
          className="neu-btn-brand inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-sm group"
        >
          <Sparkles className="w-4 h-4 text-brand-200 group-hover:rotate-12 transition-transform" />
          <span>Ask RetailIQ Copilot</span>
        </Link>
      </div>

      {/* Top 6 Neumorphic KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* KPI 1: Today's Revenue */}
        <div className="p-4 rounded-2xl neu-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Today's Revenue</span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-white font-mono">
              ₹{kpis.todayRevenue.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium">
              {kpis.revenueChangePct >= 0 ? (
                <span className="text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3 h-3" /> +{kpis.revenueChangePct}%
                </span>
              ) : (
                <span className="text-rose-400 flex items-center">
                  <ArrowDownRight className="w-3 h-3" /> {kpis.revenueChangePct}%
                </span>
              )}
              <span className="text-slate-500">vs yesterday</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Units Sold */}
        <div className="p-4 rounded-2xl neu-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Units Sold</span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-blue-400">
              <Boxes className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-white font-mono">
              {kpis.todayUnits.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium">
              {kpis.unitsChangePct >= 0 ? (
                <span className="text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3 h-3" /> +{kpis.unitsChangePct}%
                </span>
              ) : (
                <span className="text-rose-400 flex items-center">
                  <ArrowDownRight className="w-3 h-3" /> {kpis.unitsChangePct}%
                </span>
              )}
              <span className="text-slate-500">vs yesterday</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Stock-out Risks */}
        <div className="p-4 rounded-2xl neu-card-critical flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-300">Stock-out Risks</span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 shadow-[inset_1px_1px_3px_#060910] flex items-center justify-center text-rose-400 border border-rose-500/30">
              <AlertOctagon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-200 font-mono">
              {kpis.stockoutRisksCount} SKUs
            </div>
            <div className="mt-1 text-[11px] text-rose-400 font-medium">
              Immediate action
            </div>
          </div>
        </div>

        {/* KPI 4: Low Stock Items */}
        <div className="p-4 rounded-2xl neu-card-warning flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300">Below Reorder Point</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 shadow-[inset_1px_1px_3px_#060910] flex items-center justify-center text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-amber-200 font-mono">
              {kpis.lowStockItemsCount} SKUs
            </div>
            <div className="mt-1 text-[11px] text-amber-400 font-medium">
              Replenishment candidate
            </div>
          </div>
        </div>

        {/* KPI 5: Slow Movers */}
        <div className="p-4 rounded-2xl neu-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Slow Movers</span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-purple-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-white font-mono">
              {kpis.slowMoversCount} SKUs
            </div>
            <div className="mt-1 text-[11px] text-purple-400 font-medium">
              Excess holding
            </div>
          </div>
        </div>

        {/* KPI 6: Active Alerts */}
        <div className="p-4 rounded-2xl neu-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Alerts</span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm flex items-center justify-center text-indigo-400">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-white font-mono">
              {kpis.activeAlertsCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-medium">
              System flags
            </div>
          </div>
        </div>
      </div>

      {/* "Needs Attention Today" Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-400" />
              Needs Attention Today
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic priority queue ranked by risk severity and days until stock depletion.
            </p>
          </div>
          <Link
            to="/recommendations"
            className="neu-btn px-3 py-1.5 rounded-xl text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
          >
            View all recommended actions <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {attentionAlerts.map((alert) => {
            const product = summaries.find(s => s.product.id === alert.productId)?.product;
            const currentStock = alert.metrics.currentStock ?? 0;
            const avgDailySales = alert.metrics.avgDailySales ?? 0;
            const daysRemaining = alert.metrics.daysRemaining ?? 0;

            const handleWhyClick = () => {
              if (product) {
                const explType = alert.type === 'LOW_STOCK' ? 'REORDER' : alert.type;
                const expl = AnalyticsEngine.buildWhyExplanation(
                  product,
                  currentStoreName,
                  currentStock,
                  sales,
                  explType,
                  selectedStoreId !== 'all' ? selectedStoreId : undefined
                );
                openWhy(expl);
              }
            };

            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl transition-all flex flex-col justify-between ${
                  isCritical
                    ? 'neu-card-critical'
                    : isWarning
                    ? 'neu-card-warning'
                    : 'neu-card'
                }`}
              >
                <div>
                  {/* Card Header: Severity Badge & Store */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shadow-[inset_1px_1px_3px_#060910] border ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}
                    >
                      {alert.type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {currentStoreName}
                    </span>
                  </div>

                  {/* Product Title */}
                  <h3 className="text-base font-bold text-white mt-2.5 leading-snug">
                    {product?.name || alert.title}
                  </h3>

                  {/* Key Numerical Metrics Neumorphic Well */}
                  <div className="mt-3 grid grid-cols-3 gap-2 p-2.5 neu-sunken rounded-xl text-center font-mono">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-sans">Stock</div>
                      <div className="text-xs font-bold text-white mt-0.5">{currentStock}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-sans">Velocity</div>
                      <div className="text-xs font-bold text-slate-200 mt-0.5">{avgDailySales}/d</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-sans">Runway</div>
                      <div className={`text-xs font-bold mt-0.5 ${daysRemaining <= 2.5 ? 'text-rose-400' : 'text-amber-300'}`}>
                        {daysRemaining}d
                      </div>
                    </div>
                  </div>

                  {/* Recommendation snippet */}
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    <strong className="text-white font-semibold">Action: </strong>
                    {alert.recommendation}
                  </p>
                </div>

                {/* Card Action Footer with "Why?" Neumorphic Button */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={handleWhyClick}
                    className="neu-btn inline-flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Why?</span>
                  </button>

                  <span className="text-[10px] text-slate-500 font-mono">
                    Lead time: {product?.leadTimeDays || 3} days
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Charts Section: 7-Day Revenue Trend & Category Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Revenue Velocity */}
        <div className="lg:col-span-2 p-6 rounded-2xl neu-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Daily Revenue Trend</h3>
              <p className="text-xs text-slate-400">Trailing 7-day registered POS store revenue (₹)</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-xl neu-sunken-sm text-slate-300">
              {currentStoreName}
            </span>
          </div>
          <div className="h-64 w-full p-2 neu-sunken rounded-xl">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7DaysSales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0e17', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px', boxShadow: '5px 5px 15px #060910' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Inventory Risk Radar */}
        <div className="p-6 rounded-2xl neu-card flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Inventory Health Composition</h3>
            <p className="text-xs text-slate-400">Categorical SKU allocation by operational status</p>
            
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl neu-sunken">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]"></span>
                  <span>Optimal Safe Stock</span>
                </div>
                <span className="text-xs font-bold text-white font-mono">
                  {summaries.filter(s => !s.isStockoutRisk && !s.isLowStock && !s.isOverstocked).length} SKUs
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-rose-950/20 neu-sunken border border-rose-500/20">
                <div className="flex items-center gap-2 text-xs text-rose-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]"></span>
                  <span>Imminent Stockout Risk</span>
                </div>
                <span className="text-xs font-bold text-rose-300 font-mono">
                  {kpis.stockoutRisksCount} SKUs
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 neu-sunken border border-amber-500/20">
                <div className="flex items-center gap-2 text-xs text-amber-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
                  <span>Below Reorder Threshold</span>
                </div>
                <span className="text-xs font-bold text-amber-300 font-mono">
                  {kpis.lowStockItemsCount} SKUs
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-950/20 neu-sunken border border-purple-500/20">
                <div className="flex items-center gap-2 text-xs text-purple-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]"></span>
                  <span>Slow-Moving / Overstock</span>
                </div>
                <span className="text-xs font-bold text-purple-300 font-mono">
                  {kpis.slowMoversCount} SKUs
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              to="/inventory"
              className="neu-btn w-full block text-center py-2 px-3 rounded-xl text-slate-200 text-xs font-semibold"
            >
              Open Full Inventory Ledger →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
