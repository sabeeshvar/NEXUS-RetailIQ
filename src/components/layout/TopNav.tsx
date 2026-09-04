import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, DataSourceType, DataSourceMetadata } from '../../types';
import {
  Store as StoreIcon,
  Search,
  Database,
  RefreshCw,
  LogOut,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TopNavProps {
  stores: Store[];
  selectedStoreId: string;
  onSelectStore: (id: string) => void;
  hasData: boolean;
  onLoadDemo: () => void;
  isLoading: boolean;
  activeDataSource: DataSourceType;
  dataSourceMetadata: DataSourceMetadata | null;
  onClearImportedData: () => Promise<void>;
}

export const TopNav: React.FC<TopNavProps> = ({
  stores,
  selectedStoreId,
  onSelectStore,
  hasData,
  onLoadDemo,
  isLoading,
  activeDataSource,
  dataSourceMetadata,
  onClearImportedData,
}) => {
  const navigate = useNavigate();
  const { currentUser, userProfile, logout } = useAuth();

  const displayName =
    userProfile?.name ||
    currentUser?.displayName ||
    currentUser?.email?.split('@')[0] ||
    'Store Manager';
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const isUploadedData =
    activeDataSource === 'UPLOADED_CSV' || activeDataSource === 'UPLOADED_SQLITE';

  return (
    <header className="h-16 bg-[#0c101a] border-b border-slate-900 px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_20px_#060910]">
      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products, SKUs, or alerts... (Ctrl + K)"
            className="w-full neu-sunken rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500/40 transition-all"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Visible Active Data Source Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl neu-sunken text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              isUploadedData
                ? 'bg-emerald-400 animate-pulse'
                : activeDataSource === 'FIRESTORE'
                ? 'bg-sky-400'
                : 'bg-amber-400'
            }`}
          ></span>
          <span className="text-slate-400 font-sans text-[11px]">Data Source:</span>
          <span
            className={`font-bold text-xs truncate max-w-[170px] ${
              isUploadedData
                ? 'text-emerald-300'
                : activeDataSource === 'FIRESTORE'
                ? 'text-sky-300'
                : 'text-amber-300'
            }`}
            title={dataSourceMetadata?.fileName || activeDataSource}
          >
            {activeDataSource === 'UPLOADED_CSV'
              ? `Uploaded CSV (${dataSourceMetadata?.fileName || 'custom.csv'})`
              : activeDataSource === 'UPLOADED_SQLITE'
              ? `SQLite (${dataSourceMetadata?.fileName || 'db.sqlite'})`
              : activeDataSource === 'FIRESTORE'
              ? 'Cloud Firestore'
              : 'Demo Data'}
          </span>
        </div>

        {/* Clear Imported Data Button (when uploaded data is active) */}
        {isUploadedData && (
          <button
            onClick={onClearImportedData}
            title="Clear uploaded data and return to default demo data"
            className="neu-btn px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-300 hover:text-rose-200 cursor-pointer flex items-center gap-1 border border-rose-500/30"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span className="hidden sm:inline">Clear Uploaded</span>
          </button>
        )}

        {/* Import Data Main Action Button */}
        <button
          onClick={() => navigate('/import-data')}
          className="neu-btn px-3 py-1.5 rounded-xl text-xs font-bold text-brand-300 hover:text-brand-200 cursor-pointer flex items-center gap-1.5 border border-brand-500/30 shadow-sm"
          title="Import CSV or SQLite POS file"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400" />
          <span className="hidden md:inline">Import Data</span>
        </button>

        {/* Store Selector */}
        <div className="flex items-center gap-2 neu-sunken rounded-xl px-3 py-1.5">
          <StoreIcon className="w-4 h-4 text-brand-400" />
          <select
            value={selectedStoreId}
            onChange={(e) => onSelectStore(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all" className="bg-[#0e1420] text-slate-200">
              All Stores (Consolidated)
            </option>
            {stores.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0e1420] text-slate-200">
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Demo Data Reset (when demo data is active) */}
        {!isUploadedData && (
          <>
            {!hasData ? (
              <button
                onClick={onLoadDemo}
                disabled={isLoading}
                className="neu-btn-brand flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Loading...' : 'Load Demo'}</span>
              </button>
            ) : (
              <button
                onClick={onLoadDemo}
                title="Reload fresh demo scenario data"
                className="neu-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-slate-300 text-xs font-medium cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Reset Demo</span>
              </button>
            )}
          </>
        )}

        {/* Manager User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-900">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-700 text-white font-bold flex items-center justify-center text-xs shadow-[3px_3px_7px_#060910,-3px_-3px_7px_#18243a]">
            {initial}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
              {displayName}
            </div>
            <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {userProfile?.role || 'manager'}
            </div>
          </div>

          {/* Logout Action */}
          <button
            onClick={handleLogout}
            title="Sign out of NEXUS RetailIQ"
            className="neu-btn p-2 rounded-xl text-slate-400 hover:text-rose-400 cursor-pointer ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
