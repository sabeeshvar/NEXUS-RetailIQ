import React, { useState } from 'react';
import { useExplain } from '../components/layout/AppLayout';
import {
  Bell,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from 'lucide-react';
import { AnalyticsEngine } from '../lib/analytics/engine';

export const AlertsPage: React.FC = () => {
  const { retailData, openWhy } = useExplain();
  const { alerts, summaries, sales, stores, selectedStoreId } = retailData;

  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  const currentStoreName = selectedStoreId !== 'all'
    ? stores.find(s => s.id === selectedStoreId)?.name || 'Selected Store'
    : 'All Stores';

  const toggleReviewed = (id: string) => {
    setReviewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === 'ALL') return true;
    return a.severity === severityFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Active Retail Alerts</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated threshold triggers for stock exhaustion, excess inventory, and sales velocity anomalies.
          </p>
        </div>

        {/* Severity Filter Pills */}
        <div className="flex bg-surface-900 border border-slate-800 rounded-xl p-1 gap-1">
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                severityFilter === sev
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center bg-surface-900 border border-slate-800 rounded-2xl text-slate-400 text-sm">
            No alerts match the selected filter.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isReviewed = reviewedIds.has(alert.id);
            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';
            const product = summaries.find((s) => s.product.id === alert.productId)?.product;

            const handleWhy = () => {
              if (product) {
                const currentStock = alert.metrics.currentStock ?? 20;
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

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl bg-surface-900 border transition-all ${
                  isReviewed
                    ? 'opacity-60 border-slate-800'
                    : isCritical
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : isWarning
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-blue-500/30 bg-blue-500/5'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isCritical
                          ? 'bg-rose-500/20 text-rose-400'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {isCritical ? (
                        <AlertOctagon className="w-5 h-5" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Info className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isWarning
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          {alert.severity} • {alert.type.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Store: {currentStoreName}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mt-1.5">{alert.title}</h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.description}</p>

                      <div className="mt-2.5 p-2.5 bg-surface-950/80 rounded-xl border border-slate-800/80 text-xs">
                        <strong className="text-brand-300 font-semibold">Recommended Action: </strong>
                        <span className="text-slate-200">{alert.recommendation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                    <button
                      onClick={handleWhy}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 text-xs font-bold border border-brand-500/30 transition-all cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Why?</span>
                    </button>

                    <button
                      onClick={() => toggleReviewed(alert.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        isReviewed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isReviewed ? 'Reviewed ✓' : 'Mark Reviewed'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
