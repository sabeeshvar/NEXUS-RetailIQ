import { Product, Sale, InventoryRecord } from '../types';
import { DataRepository } from './dataRepository';

export interface ImportValidationResult<T> {
  entityType: 'products' | 'stores' | 'sales' | 'inventory';
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; field: string; message: string }[];
  validData: T[];
  preview: Record<string, unknown>[];
}

export class DataImporter {
  /**
   * Native robust CSV parser with header mapping and quoted string handling
   */
  public static async parseCsv(file: File): Promise<Record<string, unknown>[]> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    // Parse header
    const headers = this.parseCsvLine(lines[0]);
    const records: Record<string, unknown>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0) continue;

      const record: Record<string, unknown> = {};
      headers.forEach((h, colIdx) => {
        const key = h.trim();
        const rawVal = values[colIdx]?.trim() ?? '';
        // Auto convert numeric values
        if (rawVal !== '' && !isNaN(Number(rawVal))) {
          record[key] = Number(rawVal);
        } else {
          record[key] = rawVal;
        }
      });
      records.push(record);
    }

    return records;
  }

  private static parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    return values.map((v) => v.replace(/^"|"$/g, '').trim());
  }

  public static validateProducts(rows: Record<string, unknown>[], fileName: string): ImportValidationResult<Product> {
    const validData: Product[] = [];
    const errors: { row: number; field: string; message: string }[] = [];

    rows.forEach((r, idx) => {
      const rowNum = idx + 1;
      const id = String(r.id || `prod-${Date.now()}-${idx}`);
      const name = String(r.name || '').trim();
      const category = (r.category || 'Grocery') as Product['category'];
      const sku = String(r.sku || '').trim();
      const sellingPrice = Number(r.sellingPrice || r.selling_price || 0);
      const costPrice = Number(r.costPrice || r.cost_price || 0);
      const leadTimeDays = Number(r.leadTimeDays || r.lead_time_days || 3);
      const safetyStock = Number(r.safetyStock || r.safety_stock || 10);
      const reorderQuantity = Number(r.reorderQuantity || r.reorder_quantity || 30);
      const supplier = String(r.supplier || 'Standard Distributor');

      if (!name) {
        errors.push({ row: rowNum, field: 'name', message: 'Product name is required.' });
        return;
      }
      if (!sku) {
        errors.push({ row: rowNum, field: 'sku', message: 'Product SKU is required.' });
        return;
      }
      if (sellingPrice <= 0 || isNaN(sellingPrice)) {
        errors.push({ row: rowNum, field: 'sellingPrice', message: 'Selling price must be a positive number.' });
        return;
      }

      validData.push({
        id,
        name,
        category,
        sku,
        sellingPrice,
        costPrice,
        leadTimeDays,
        safetyStock,
        reorderQuantity,
        supplier,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
    });

    return {
      entityType: 'products',
      fileName,
      totalRows: rows.length,
      validRows: validData.length,
      invalidRows: errors.length,
      errors,
      validData,
      preview: rows.slice(0, 5),
    };
  }

  public static validateSales(rows: Record<string, unknown>[], fileName: string): ImportValidationResult<Sale> {
    const validData: Sale[] = [];
    const errors: { row: number; field: string; message: string }[] = [];

    rows.forEach((r, idx) => {
      const rowNum = idx + 1;
      const id = String(r.id || `sale-${Date.now()}-${idx}`);
      const date = String(r.date || '');
      const storeId = String(r.storeId || r.store_id || '');
      const productId = String(r.productId || r.product_id || '');
      const quantity = Number(r.quantity || 0);
      const revenue = Number(r.revenue || 0);
      const unitPrice = Number(r.unitPrice || r.unit_price || 0);

      if (!date) {
        errors.push({ row: rowNum, field: 'date', message: 'Sale date (YYYY-MM-DD) is required.' });
        return;
      }
      if (!storeId) {
        errors.push({ row: rowNum, field: 'storeId', message: 'Store ID is required.' });
        return;
      }
      if (!productId) {
        errors.push({ row: rowNum, field: 'productId', message: 'Product ID is required.' });
        return;
      }
      if (quantity <= 0 || isNaN(quantity)) {
        errors.push({ row: rowNum, field: 'quantity', message: 'Quantity must be greater than 0.' });
        return;
      }

      validData.push({
        id,
        date,
        storeId,
        productId,
        quantity,
        revenue: revenue || quantity * unitPrice,
        unitPrice: unitPrice || (revenue > 0 ? revenue / quantity : 0),
        createdAt: `${date}T12:00:00.000Z`,
      });
    });

    return {
      entityType: 'sales',
      fileName,
      totalRows: rows.length,
      validRows: validData.length,
      invalidRows: errors.length,
      errors,
      validData,
      preview: rows.slice(0, 5),
    };
  }

  public static validateInventory(rows: Record<string, unknown>[], fileName: string): ImportValidationResult<InventoryRecord> {
    const validData: InventoryRecord[] = [];
    const errors: { row: number; field: string; message: string }[] = [];

    rows.forEach((r, idx) => {
      const rowNum = idx + 1;
      const id = String(r.id || `inv-${Date.now()}-${idx}`);
      const storeId = String(r.storeId || r.store_id || '');
      const productId = String(r.productId || r.product_id || '');
      const quantity = Number(r.quantity ?? -1);
      const date = String(r.date || new Date().toISOString().split('T')[0]);

      if (!storeId) {
        errors.push({ row: rowNum, field: 'storeId', message: 'Store ID is required.' });
        return;
      }
      if (!productId) {
        errors.push({ row: rowNum, field: 'productId', message: 'Product ID is required.' });
        return;
      }
      if (quantity < 0 || isNaN(quantity)) {
        errors.push({ row: rowNum, field: 'quantity', message: 'Stock quantity cannot be negative.' });
        return;
      }

      validData.push({
        id,
        storeId,
        productId,
        quantity,
        date,
        updatedAt: new Date().toISOString(),
      });
    });

    return {
      entityType: 'inventory',
      fileName,
      totalRows: rows.length,
      validRows: validData.length,
      invalidRows: errors.length,
      errors,
      validData,
      preview: rows.slice(0, 5),
    };
  }

  public static commitImport(result: ImportValidationResult<any>): void {
    if (result.entityType === 'products') {
      DataRepository.importProducts(result.validData as Product[]);
    } else if (result.entityType === 'sales') {
      DataRepository.importSales(result.validData as Sale[]);
    } else if (result.entityType === 'inventory') {
      DataRepository.importInventory(result.validData as InventoryRecord[]);
    }
  }
}
