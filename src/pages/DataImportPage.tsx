import React, { useState } from 'react';
import { useExplain } from '../components/layout/AppLayout';
import { DataImporter, ImportValidationResult } from '../services/dataImporter';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertOctagon,
  Database,
  RefreshCw,
  FileText,
  Trash2,
  ArrowRight,
} from 'lucide-react';

export const DataImportPage: React.FC = () => {
  const { retailData } = useExplain();
  const { loadDemo, clearAll, isLoading, hasData } = retailData;

  const [importType, setImportType] = useState<'products' | 'sales' | 'inventory'>('products');
  const [validationResult, setValidationResult] = useState<ImportValidationResult<any> | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await DataImporter.parseCsv(file);
      let res: ImportValidationResult<any>;

      if (importType === 'products') {
        res = DataImporter.validateProducts(rows, file.name);
      } else if (importType === 'sales') {
        res = DataImporter.validateSales(rows, file.name);
      } else {
        res = DataImporter.validateInventory(rows, file.name);
      }

      setValidationResult(res);
      setImportStatus(null);
    } catch (err: any) {
      alert(`CSV parsing error: ${err.message}`);
    }
  };

  const handleCommit = () => {
    if (!validationResult || validationResult.validRows === 0) return;
    DataImporter.commitImport(validationResult);
    setImportStatus(`Successfully imported ${validationResult.validRows} ${validationResult.entityType} records.`);
    setValidationResult(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Data Ingestion & Import Engine</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Ingest daily POS sales transactions, inventory balance sheets, and product catalogs with strict schema validation.
        </p>
      </div>

      {/* Demo Data Quick Action Card */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-brand-500/30 shadow-glow-brand flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>Instant Demo Scenario Generator</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">Populate 90-Day Indian Retail Dataset</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Loads 3 stores (Dharapuram, Coimbatore, Erode), 24 Indian FMCG products, and 90 days of transactions explicitly containing stockout risks, overstocked items, slow movers, and demand spikes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadDemo}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-900/40 transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Generating Data...' : 'Load Full Demo Dataset'}</span>
          </button>

          {hasData && (
            <button
              onClick={clearAll}
              title="Clear all stored data"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Manual CSV File Ingestion */}
      <div className="p-6 rounded-2xl bg-surface-900 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white">Import Custom Retail Data (CSV)</h3>
        
        {/* Entity Type Picker */}
        <div className="flex gap-2">
          {(['products', 'sales', 'inventory'] as const).map((type) => (
            <button
              key={type}
              onClick={() => {
                setImportType(type);
                setValidationResult(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                importType === type
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-surface-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Upload Dropzone */}
        <label className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-surface-950/40">
          <UploadCloud className="w-10 h-10 text-brand-400 mb-2" />
          <span className="text-sm font-bold text-white">Click to select {importType}.csv</span>
          <span className="text-xs text-slate-400 mt-1">Supports standard UTF-8 CSV exports from retail POS systems</span>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {importStatus && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Validation Results Box */}
        {validationResult && (
          <div className="p-5 rounded-2xl bg-surface-950 border border-slate-800 space-y-4 font-mono">
            <div className="flex items-center justify-between font-sans">
              <div>
                <span className="text-xs text-slate-400">File Ingested:</span>
                <span className="text-xs font-bold text-white ml-2">{validationResult.fileName}</span>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Valid: {validationResult.validRows}
                </span>
                {validationResult.invalidRows > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    Errors: {validationResult.invalidRows}
                  </span>
                )}
              </div>
            </div>

            {/* Error Listing */}
            {validationResult.errors.length > 0 && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 font-sans text-xs">
                <div className="font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" />
                  Validation Issues Detected:
                </div>
                {validationResult.errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="text-rose-200">
                    Row {err.row}: [{err.field}] {err.message}
                  </div>
                ))}
              </div>
            )}

            {/* Commit Import Button */}
            <div className="flex justify-end pt-2 border-t border-slate-800/80 font-sans">
              <button
                onClick={handleCommit}
                disabled={validationResult.validRows === 0}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Commit {validationResult.validRows} Valid Records</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
