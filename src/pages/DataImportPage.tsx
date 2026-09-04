import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExplain } from '../components/layout/AppLayout';
import { DataImporter, FileInspectionResult } from '../services/dataImporter';
import { NEXUS_FIELDS, NexusFieldKey, NormalizedDataset } from '../services/dataNormalizer';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Database,
  RefreshCw,
  Trash2,
  ArrowRight,
  FileSpreadsheet,
  Layers,
  Table,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const DataImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { retailData } = useExplain();
  const {
    activeDataSource,
    dataSourceMetadata,
    clearImportedData,
    loadDemo,
    isLoading: isDataLoading,
  } = retailData;

  // Multi-step import states
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // File & inspection state
  const [inspection, setInspection] = useState<FileInspectionResult | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [columnMappings, setColumnMappings] = useState<Record<NexusFieldKey, string | null>>({
    product_name: null,
    product_sku: null,
    product_category: null,
    product_price: null,
    product_cost: null,
    product_lead_time: null,
    product_safety_stock: null,
    store_name: null,
    sale_date: null,
    sale_quantity: null,
    sale_revenue: null,
    inventory_stock: null,
  });

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process incoming file
  const handleFileProcess = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessing(true);

    try {
      const result = await DataImporter.inspectFile(file);
      setInspection(result);
      setSelectedTable(result.selectedTable || '');
      setColumnMappings(result.suggestedMappings);
    } catch (err: any) {
      console.error('[DataImport] Error inspecting file:', err);
      setErrorMsg(err.message || 'Failed to inspect file. Please ensure it is a valid CSV or SQLite database.');
      setInspection(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // SQLite table switch handler
  const handleSqliteTableChange = (tableName: string) => {
    if (!inspection || !inspection.sqliteData) return;
    setSelectedTable(tableName);

    const tbl = inspection.sqliteData.tables.find((t) => t.name === tableName);
    if (tbl) {
      const suggested = DataImporter['parseCsvFile'] // fallback
        ? inspection.suggestedMappings
        : inspection.suggestedMappings;
      setColumnMappings(suggested);
    }
  };

  // User alters a field mapping
  const handleMappingChange = (fieldKey: NexusFieldKey, sourceCol: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [fieldKey]: sourceCol === '__UNMAPPED__' ? null : sourceCol,
    }));
  };

  // Validation: Check required fields
  const validationStatus = useMemo(() => {
    const hasProductName = Boolean(columnMappings.product_name);
    const hasDate = Boolean(columnMappings.sale_date);
    const hasQuantity = Boolean(columnMappings.sale_quantity);
    const hasStock = Boolean(columnMappings.inventory_stock);
    const hasRevenue = Boolean(columnMappings.sale_revenue);

    const missingRequired: string[] = [];
    if (!hasProductName) missingRequired.push('Product Name');
    if (!hasDate) missingRequired.push('Transaction Date');
    if (!hasQuantity) missingRequired.push('Units Sold / Quantity');

    const isValid = missingRequired.length === 0;

    return {
      isValid,
      missingRequired,
      hasStock,
      hasRevenue,
      salesAnalyticsReady: hasDate && (hasRevenue || hasQuantity),
      inventoryIntelligenceReady: hasStock,
      reorderRecommendationsReady: hasStock && hasQuantity,
    };
  }, [columnMappings]);

  // Commit and activate dataset
  const handleCommit = async () => {
    if (!inspection || !validationStatus.isValid) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const normalized: NormalizedDataset = await DataImporter.commitDataset(
        inspection,
        columnMappings,
        selectedTable
      );

      setSuccessMsg(
        `Successfully imported & activated "${inspection.fileName}"! Loaded ${normalized.summary.validSalesRecords.toLocaleString()} sales records, ${normalized.products.length} products, and ${normalized.stores.length} store(s).`
      );
      setInspection(null);
    } catch (err: any) {
      console.error('[DataImport] Error committing dataset:', err);
      setErrorMsg(err.message || 'Failed to normalize and save dataset.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick load sample dataset for fast evaluation
  const handleLoadSampleCsv = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/sample_retail_data.csv');
      if (!res.ok) throw new Error('Sample CSV file not found on server.');
      const blob = await res.blob();
      const file = new File([blob], 'sample_retail_data.csv', { type: 'text/csv' });
      await handleFileProcess(file);
    } catch (err: any) {
      setErrorMsg(`Failed to load sample dataset: ${err.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Import Retail Data</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-500/20 text-brand-300 border border-brand-500/30">
              CSV & SQLite Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Upload your POS transaction sheets or SQLite database. All dashboards, alerts, inventory formulas, and Gemini AI will dynamically recalculate from your real data.
          </p>
        </div>

        {/* Current Active Source Indicator & Clear Button */}
        {activeDataSource !== 'DEMO' && activeDataSource !== 'FIRESTORE' && (
          <div className="neu-card p-3 rounded-2xl flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Data Source</div>
                <div className="text-xs font-bold text-emerald-300 truncate max-w-[160px]">
                  {dataSourceMetadata?.fileName || (activeDataSource === 'UPLOADED_CSV' ? 'Uploaded CSV' : 'SQLite DB')}
                </div>
              </div>
            </div>
            <button
              onClick={clearImportedData}
              title="Clear imported dataset and return to default demo data"
              className="neu-btn px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 hover:text-rose-200 cursor-pointer flex items-center gap-1.5 border border-rose-500/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Imported Data</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-2xl neu-card-success border border-emerald-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <div>
              <div className="font-bold text-sm text-white">Import Succeeded & Data Activated!</div>
              <div>{successMsg}</div>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="neu-btn-brand px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>View Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <div className="font-bold text-sm text-white">Validation / Import Error</div>
            <div className="mt-0.5">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Step 1: File Ingestion Dropzone */}
      {!inspection && (
        <div className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all neu-sunken ${
              dragActive ? 'border-brand-400 bg-brand-500/5' : 'border-slate-800 hover:border-brand-500/60'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-indigo-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4 shadow-[3px_3px_8px_#060910,-3px_-3px_8px_#18243a]">
              {isProcessing ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : (
                <UploadCloud className="w-8 h-8" />
              )}
            </div>

            <h3 className="text-base font-bold text-white">
              {isProcessing ? 'Inspecting & Analyzing File...' : 'Drag & Drop CSV or SQLite File Here'}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 max-w-md leading-relaxed">
              Supports <span className="text-brand-300 font-semibold font-mono">.csv</span>,{' '}
              <span className="text-brand-300 font-semibold font-mono">.db</span>,{' '}
              <span className="text-brand-300 font-semibold font-mono">.sqlite</span>, and{' '}
              <span className="text-brand-300 font-semibold font-mono">.sqlite3</span> files from any POS, ERP, or retail ledger.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="neu-btn-brand px-5 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Browse Files</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.db,.sqlite,.sqlite3"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Quick Benchmark Sample Loader */}
          <div className="p-5 rounded-2xl neu-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Need a Sample Dataset to Test?
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
                  Load our comprehensive multi-store benchmark CSV (12 SKUs, 2 stores, 35+ days of POS checkout records, stockout horizons, and inventory levels).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleLoadSampleCsv}
                disabled={isProcessing}
                className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white cursor-pointer flex items-center gap-2 border border-slate-700/60"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400" />
                <span>Test with Sample CSV</span>
              </button>

              <button
                onClick={loadDemo}
                disabled={isDataLoading}
                className="neu-btn px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 cursor-pointer flex items-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Reset Demo Scenario</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 & 3: File Inspected — Table Picker, Mapping & Preview */}
      {inspection && (
        <div className="space-y-6">
          {/* File Overview Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 neu-card rounded-2xl font-mono">
              <div className="text-[11px] font-sans text-slate-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand-400" />
                File Name
              </div>
              <div className="text-sm font-bold text-white mt-1 truncate" title={inspection.fileName}>
                {inspection.fileName}
              </div>
              <div className="text-[10px] text-slate-500 uppercase mt-0.5 font-sans">
                {inspection.fileType.toUpperCase()} Format
              </div>
            </div>

            <div className="p-4 neu-card rounded-2xl font-mono">
              <div className="text-[11px] font-sans text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Total Rows
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {inspection.totalRows.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                {inspection.sourceColumns.length} Source Columns
              </div>
            </div>

            <div className="p-4 neu-card rounded-2xl font-mono">
              <div className="text-[11px] font-sans text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Validation
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {validationStatus.isValid ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Ready
                  </span>
                ) : (
                  <span className="text-amber-400">Incomplete</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                {validationStatus.isValid
                  ? 'Required fields mapped'
                  : `${validationStatus.missingRequired.length} required field(s) missing`}
              </div>
            </div>

            <div className="p-4 neu-card rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400">Actions</div>
                <button
                  onClick={() => setInspection(null)}
                  className="text-xs font-bold text-slate-400 hover:text-white mt-1 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Choose Another</span>
                </button>
              </div>
              <button
                onClick={handleCommit}
                disabled={!validationStatus.isValid || isProcessing}
                className="neu-btn-brand px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-md"
              >
                {isProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Activate Dataset</span>
              </button>
            </div>
          </div>

          {/* SQLite Table Selector (if SQLite file) */}
          {inspection.fileType === 'sqlite' && inspection.sqliteData && (
            <div className="p-5 neu-card rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-brand-400" />
                <h3 className="text-sm font-bold text-white">Discovered SQLite Tables</h3>
                <span className="text-xs text-slate-400">
                  (Detected {inspection.sqliteData.tables.length} tables)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {inspection.sqliteData.tables.map((tbl) => (
                  <div
                    key={tbl.name}
                    onClick={() => handleSqliteTableChange(tbl.name)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                      selectedTable === tbl.name
                        ? 'neu-btn-brand border-brand-500 text-white'
                        : 'neu-card hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs font-mono">{tbl.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/60 text-slate-400">
                        {tbl.rowCount} rows
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono truncate">
                      Cols: {tbl.columns.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Column Mapping Interface */}
          <div className="p-6 neu-card rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Visual Column Mapping</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Confirm or adjust how columns from your file match internal NEXUS RetailIQ fields.
                </p>
              </div>

              {/* Feature Readiness Badges */}
              <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                <span
                  className={`px-2 py-0.5 rounded-full border ${
                    validationStatus.salesAnalyticsReady
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Sales Analytics: {validationStatus.salesAnalyticsReady ? 'Ready' : 'Needs Date+Qty'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border ${
                    validationStatus.inventoryIntelligenceReady
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  Inventory: {validationStatus.inventoryIntelligenceReady ? 'Ready' : 'Stock Column Missing'}
                </span>
              </div>
            </div>

            {/* Mapping Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {NEXUS_FIELDS.map((field) => {
                const currentMappedCol = columnMappings[field.key] || '';
                const isMapped = Boolean(currentMappedCol);

                return (
                  <div
                    key={field.key}
                    className={`p-3.5 rounded-xl transition-all border ${
                      field.required && !isMapped
                        ? 'bg-rose-500/5 border-rose-500/40'
                        : isMapped
                        ? 'neu-sunken border-slate-800/80'
                        : 'bg-slate-900/30 border-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{field.label}</span>
                        {field.required ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-800 text-slate-400">
                            Optional
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isMapped
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : field.required
                            ? 'text-rose-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {isMapped ? 'Mapped' : 'Unmapped'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                      {field.description}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 shrink-0">Source Column:</span>
                      <select
                        value={currentMappedCol || '__UNMAPPED__'}
                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        className="flex-1 neu-sunken rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer font-mono"
                      >
                        <option value="__UNMAPPED__" className="bg-[#0e1420] text-slate-400">
                          (None / Not in file)
                        </option>
                        {inspection.sourceColumns.map((col) => (
                          <option key={col} value={col} className="bg-[#0e1420] text-slate-200">
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Validation Message if required fields missing */}
            {!validationStatus.isValid && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  Please map the following required fields to activate this dataset:{' '}
                  <strong>{validationStatus.missingRequired.join(', ')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Step 4: Sample Data Table Preview */}
          <div className="p-6 neu-card rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Data Preview (First 5 Raw Records)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify raw row values before applying normalization.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing sample rows from {inspection.fileName}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-900">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0e1420] text-slate-400 border-b border-slate-800">
                  <tr>
                    {inspection.sourceColumns.map((col) => (
                      <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {inspection.sampleRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      {inspection.sourceColumns.map((col) => (
                        <td key={col} className="px-3.5 py-2 whitespace-nowrap">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Commit CTA */}
            <div className="pt-4 border-t border-slate-900 flex items-center justify-between">
              <button
                onClick={() => setInspection(null)}
                className="neu-btn px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleCommit}
                disabled={!validationStatus.isValid || isProcessing}
                className="neu-btn-brand px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-40"
              >
                {isProcessing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Activate Uploaded Dataset Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
