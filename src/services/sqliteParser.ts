import initSqlJs, { Database } from 'sql.js';

export interface SqliteTableInfo {
  name: string;
  columns: string[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
  detectedRole?: 'sales' | 'products' | 'inventory' | 'stores' | 'consolidated';
}

export interface SqliteInspectionResult {
  fileName: string;
  tables: SqliteTableInfo[];
  db: Database;
}

export class SqliteParser {
  private static sqlEngine: any = null;

  private static async getEngine(): Promise<any> {
    if (!this.sqlEngine) {
      this.sqlEngine = await initSqlJs({
        locateFile: (file: string) => `/${file}`,
      });
    }
    return this.sqlEngine;
  }

  /**
   * Safely parse SQLite binary file, inspect schema and tables
   */
  public static async inspectDatabase(file: File): Promise<SqliteInspectionResult> {
    const SQL = await this.getEngine();
    const arrayBuffer = await file.arrayBuffer();
    const uInt8Array = new Uint8Array(arrayBuffer);

    let db: Database;
    try {
      db = new SQL.Database(uInt8Array);
    } catch (err: any) {
      throw new Error(`Corrupted or invalid SQLite database file: ${err.message}`);
    }

    // Query all user tables
    const tablesQuery = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
    if (!tablesQuery.length || !tablesQuery[0].values.length) {
      throw new Error("No tables found in this SQLite database file.");
    }

    const tableNames: string[] = tablesQuery[0].values.map((row: any) => String(row[0]));
    const tables: SqliteTableInfo[] = [];

    for (const tbl of tableNames) {
      // Get columns
      const pragmaRes = db.exec(`PRAGMA table_info("${tbl}");`);
      const columns: string[] = pragmaRes.length && pragmaRes[0].values
        ? pragmaRes[0].values.map((row: any) => String(row[1]))
        : [];

      // Get row count
      let rowCount = 0;
      try {
        const countRes = db.exec(`SELECT COUNT(*) FROM "${tbl}";`);
        if (countRes.length && countRes[0].values.length) {
          rowCount = Number(countRes[0].values[0][0]) || 0;
        }
      } catch {
        rowCount = 0;
      }

      // Get sample rows
      const sampleRows: Record<string, unknown>[] = [];
      try {
        const sampleRes = db.exec(`SELECT * FROM "${tbl}" LIMIT 5;`);
        if (sampleRes.length && sampleRes[0].values.length) {
          const sampleCols = sampleRes[0].columns;
          sampleRes[0].values.forEach((rowVals: any[]) => {
            const obj: Record<string, unknown> = {};
            sampleCols.forEach((colName, cIdx) => {
              obj[colName] = rowVals[cIdx];
            });
            sampleRows.push(obj);
          });
        }
      } catch {
        // Ignore sample query error
      }

      // Heuristic detection
      const lowerName = tbl.toLowerCase();
      let detectedRole: SqliteTableInfo['detectedRole'];
      if (lowerName.includes('sale') || lowerName.includes('order') || lowerName.includes('transac')) {
        detectedRole = 'sales';
      } else if (lowerName.includes('prod') || lowerName.includes('item') || lowerName.includes('catalog')) {
        detectedRole = 'products';
      } else if (lowerName.includes('inv') || lowerName.includes('stock') || lowerName.includes('ware')) {
        detectedRole = 'inventory';
      } else if (lowerName.includes('store') || lowerName.includes('branch') || lowerName.includes('outlet')) {
        detectedRole = 'stores';
      } else if (tableNames.length === 1) {
        detectedRole = 'consolidated';
      }

      tables.push({
        name: tbl,
        columns,
        rowCount,
        sampleRows,
        detectedRole,
      });
    }

    return {
      fileName: file.name,
      tables,
      db,
    };
  }

  /**
   * Fetch all rows from a given table
   */
  public static fetchTableRows(db: Database, tableName: string): Record<string, unknown>[] {
    const res = db.exec(`SELECT * FROM "${tableName}";`);
    if (!res.length || !res[0].values.length) return [];

    const columns = res[0].columns;
    return res[0].values.map((rowVals: any[]) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, idx) => {
        obj[col] = rowVals[idx];
      });
      return obj;
    });
  }
}
