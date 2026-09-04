import React from 'react';
import { Store } from '../../types';
import { Store as StoreIcon, Search, Bell, Database, CheckCircle, RefreshCw, UserCheck } from 'lucide-react';

interface TopNavProps {
  stores: Store[];
  selectedStoreId: string;
  onSelectStore: (id: string) => void;
  hasData: boolean;
  onLoadDemo: () => void;
  isLoading: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  stores,
  selectedStoreId,
  onSelectStore,
  hasData,
  onLoadDemo,
  isLoading,
}) => {
  return (
    <header className="h-16 bg-surface-900/80 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products, SKUs, or alerts... (Ctrl + K)"
            className="w-full bg-surface-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Store Selector */}
        <div className="flex items-center gap-2 bg-surface-950 border border-slate-800 rounded-xl px-3 py-1.5">
          <StoreIcon className="w-4 h-4 text-brand-400" />
          <select
            value={selectedStoreId}
            onChange={(e) => onSelectStore(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-surface-900 text-slate-200">All Stores (Consolidated)</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id} className="bg-surface-900 text-slate-200">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Demo Data Button / State */}
        {!hasData ? (
          <button
            onClick={onLoadDemo}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-900/40 transition-all cursor-pointer animate-pulse"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Loading Demo...' : 'Load Demo Data'}</span>
          </button>
        ) : (
          <button
            onClick={onLoadDemo}
            title="Reload fresh demo scenario data"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>
        )}

        {/* Manager User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
            M
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-white leading-tight">Store Manager</div>
            <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live POS Sync
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
