import Papa from 'papaparse';
import { DataRepository } from './dataRepository';
import { SqliteParser, SqliteInspectionResult } from './sqliteParser';
import { DataNormalizer, NormalizedDataset, NexusFieldKey } from './dataNormalizer';
import { DataSourceMetadata } from '../types';

export interface FileInspectionResult {
  file: File;
  fileType: 'csv' | 'sqlite';
  fileName: string;
  sourceColumns: string[];
  totalRows: number;
  sampleRows: Record<string, unknown>[];
  suggestedMappings: Record<NexusFieldKey, string | null>;
  sqliteData?: SqliteInspectionResult;
  selectedTable?: string;
}

export class DataImporter {
  /**
   * Parse CSV file with PapaParse handling varying delimiters, quotes, and whitespace
   */
  public static async parseCsvFile(file: File): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            reject(new Error(results.errors[0].message));
          } else {
            resolve(results.data as Record<string, unknown>[]);
          }
        },
        error: (err) => reject(err),
      });
    });
  }

  /**
   * Inspect any uploaded file (.csv, .db, .sqlite, .sqlite3)
   */
  public static async inspectFile(file: File): Promise<FileInspectionResult> {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (ext === '.db' || ext === '.sqlite' || ext === '.sqlite3') {
      const sqliteRes = await SqliteParser.inspectDatabase(file);
      // Pick best candidate table (sales, consolidated, or first table)
      const primaryTable =
        sqliteRes.tables.find((t) => t.detectedRole === 'sales' || t.detectedRole === 'consolidated') ||
        sqliteRes.tables[0];

      const sampleRows = primaryTable.sampleRows;
      const sourceColumns = primaryTable.columns;
      const suggestedMappings = DataNormalizer.autoDetectMappings(sourceColumns);

      return {
        file,
        fileType: 'sqlite',
        fileName: file.name,
        sourceColumns,
        totalRows: primaryTable.rowCount,
        sampleRows,
        suggestedMappings,
        sqliteData: sqliteRes,
        selectedTable: primaryTable.name,
      };
    }

    if (ext === '.csv') {
      const rows = await this.parseCsvFile(file);
      if (rows.length === 0) {
        throw new Error('CSV file contains no readable data rows.');
      }

      const sourceColumns = Object.keys(rows[0] || {});
      const suggestedMappings = DataNormalizer.autoDetectMappings(sourceColumns);

      return {
        file,
        fileType: 'csv',
        fileName: file.name,
        sourceColumns,
        totalRows: rows.length,
        sampleRows: rows.slice(0, 5),
        suggestedMappings,
      };
    }

    throw new Error(`Unsupported file format '${ext}'. Please upload a .csv, .db, .sqlite, or .sqlite3 file.`);
  }

  /**
   * Normalize and commit entire dataset to DataRepository
   */
  public static async commitDataset(
    inspection: FileInspectionResult,
    mappings: Record<NexusFieldKey, string | null>,
    selectedTableName?: string
  ): Promise<NormalizedDataset> {
    let rawRows: Record<string, unknown>[] = [];

    if (inspection.fileType === 'sqlite' && inspection.sqliteData) {
      const targetTable = selectedTableName || inspection.selectedTable || inspection.sqliteData.tables[0].name;
      rawRows = SqliteParser.fetchTableRows(inspection.sqliteData.db, targetTable);
    } else {
      rawRows = await this.parseCsvFile(inspection.file);
    }

    // Normalize using custom or auto-detected mappings
    const normalized = DataNormalizer.normalizeRows(rawRows, mappings);

    // Build metadata record
    const metadata: DataSourceMetadata = {
      sourceType: inspection.fileType === 'csv' ? 'UPLOADED_CSV' : 'UPLOADED_SQLITE',
      fileName: inspection.fileName,
      fileType: inspection.fileType,
      recordCount: normalized.sales.length,
      productCount: normalized.products.length,
      storeCount: normalized.stores.length,
      dateRange: normalized.summary.dateRange,
      importedAt: new Date().toISOString(),
      hasInventoryData: normalized.inventory.length > 0,
      hasSalesData: normalized.sales.length > 0,
      hasProductData: normalized.products.length > 0,
      hasStoreData: normalized.stores.length > 0,
    };

    DataRepository.setUploadedDataset(
      {
        products: normalized.products,
        stores: normalized.stores,
        sales: normalized.sales,
        inventory: normalized.inventory,
      },
      metadata
    );

    return normalized;
  }
}
