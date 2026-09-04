import React, { useState, useMemo } from 'react';
import { useExplain } from '../components/layout/AppLayout';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

const CATEGORY_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6'];

export const SalesAnalyticsPage: React.FC = () => {
  const { retailData } = useExplain();
  const { sales, products, stores, selectedStoreId, setSelectedStoreId } = retailData;

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Filter products by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const filteredProductIds = useMemo(() => new Set(filteredProducts.map((p) => p.id)), [filteredProducts]);

  // Aggregate daily sales filtered by range and store
  const { chartData, categoryData, topSellingData } = useMemo(() => {
    const daysLimit = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const dateMap = new Map<string, { date: string; revenue: number; units: number }>();
    const catMap = new Map<string, number>();
    const prodMap = new Map<string, { name: string; revenue: number; units: number }>();

    // Sort sales descending by date
    const scopedSales = sales
      .filter((s) => (!selectedStoreId || selectedStoreId === 'all' || s.storeId === selectedStoreId))
      .filter((s) => filteredProductIds.has(s.productId));

    // Get unique dates
    const allDates = Array.from(new Set(scopedSales.map((s) => s.date))).sort().slice(-daysLimit);
    const dateSet = new Set(allDates);

    scopedSales.forEach((s) => {
      if (!dateSet.has(s.date)) return;

      // Daily trend
      const existing = dateMap.get(s.date) || { date: s.date.slice(5), revenue: 0, units: 0 };
      existing.revenue += s.revenue;
      existing.units += s.quantity;
      dateMap.set(s.date, existing);

      // Category breakdown
      const prod = products.find((p) => p.id === s.productId);
      if (prod) {
        catMap.set(prod.category, (catMap.get(prod.category) || 0) + s.revenue);

        // Product breakdown
        const pExisting = prodMap.get(prod.id) || { name: prod.name, revenue: 0, units: 0 };
        pExisting.revenue += s.revenue;
        pExisting.units += s.quantity;
        prodMap.set(prod.id, pExisting);
      }
    });

    const chartData = allDates.map((d) => dateMap.get(d) || { date: d.slice(5), revenue: 0, units: 0 });

    const categoryData = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const topSellingData = Array.from(prodMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    return { chartData, categoryData, topSellingData };
  }, [sales, products, selectedStoreId, filteredProductIds, timeRange]);

  const categories = Array.from(new Set(products.map((p) => p.category)));

  const totalPeriodRevenue = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalPeriodUnits = chartData.reduce((acc, curr) => acc + curr.units, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales Analytics & Velocity</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Granular revenue trajectories, product volume, and categorical share across stores.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time range toggle */}
          <div className="flex bg-surface-900 border border-slate-800 rounded-xl p-1">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === r
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-surface-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Mini-Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface-900 border border-slate-800 font-mono">
          <span className="text-xs text-slate-400 font-sans">Period Total Revenue</span>
          <div className="text-2xl font-bold text-white mt-1">₹{totalPeriodRevenue.toLocaleString('en-IN')}</div>
          <span className="text-[11px] text-slate-500 font-sans">Trailing {timeRange} window</span>
        </div>
        <div className="p-4 rounded-2xl bg-surface-900 border border-slate-800 font-mono">
          <span className="text-xs text-slate-400 font-sans">Period Units Sold</span>
          <div className="text-2xl font-bold text-brand-400 mt-1">{totalPeriodUnits.toLocaleString('en-IN')} units</div>
          <span className="text-[11px] text-slate-500 font-sans">Registered checkout items</span>
        </div>
        <div className="p-4 rounded-2xl bg-surface-900 border border-slate-800 font-mono">
          <span className="text-xs text-slate-400 font-sans">Daily Average Run-Rate</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ₹{Math.round(totalPeriodRevenue / (chartData.length || 1)).toLocaleString('en-IN')}/day
          </div>
          <span className="text-[11px] text-slate-500 font-sans">Normalized velocity</span>
        </div>
      </div>

      {/* Main Revenue & Unit Trends Chart */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Daily Revenue & Volume Trajectory</h3>
            <p className="text-xs text-slate-400">Trailing day-by-day sales revenue (₹)</p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesRev" x1="0" y1="0" x2="0" y2="1">
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
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#salesRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Category Share & Top SKU Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Share */}
        <div className="p-6 rounded-2xl bg-surface-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Revenue by Category</h3>
            <p className="text-xs text-slate-400">Contribution split across merchandise categories</p>
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                    fontSize={11}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Top 8 Selling SKUs */}
        <div className="p-6 rounded-2xl bg-surface-900 border border-slate-800">
          <h3 className="text-base font-bold text-white">Top 8 SKUs by Revenue</h3>
          <p className="text-xs text-slate-400">Top revenue generating items in this period</p>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSellingData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <XAxis
                  type="number"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={10}
                  width={120}
                  tickFormatter={(val) => val.length > 16 ? `${val.slice(0, 16)}…` : val}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
