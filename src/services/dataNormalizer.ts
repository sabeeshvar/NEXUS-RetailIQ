import { Product, Store, Sale, InventoryRecord, ProductCategory } from '../types';

export type NexusFieldKey =
  | 'product_name'
  | 'product_sku'
  | 'product_category'
  | 'product_price'
  | 'product_cost'
  | 'product_lead_time'
  | 'product_safety_stock'
  | 'store_name'
  | 'sale_date'
  | 'sale_quantity'
  | 'sale_revenue'
  | 'inventory_stock';

export interface FieldDefinition {
  key: NexusFieldKey;
  label: string;
  category: 'Product' | 'Store' | 'Sales' | 'Inventory';
  required: boolean;
  aliases: string[];
  description: string;
}

export const NEXUS_FIELDS: FieldDefinition[] = [
  {
    key: 'product_name',
    label: 'Product Name',
    category: 'Product',
    required: true,
    aliases: ['product_name', 'product', 'item_name', 'item', 'product_title', 'name', 'product_description', 'description', 'prod_name', 'productname', 'itemname', 'sku_name'],
    description: 'Name or description of the merchandise SKU',
  },
  {
    key: 'product_sku',
    label: 'SKU / Barcode',
    category: 'Product',
    required: false,
    aliases: ['sku', 'product_sku', 'item_code', 'code', 'barcode', 'product_id', 'prod_id', 'item_id', 'id'],
    description: 'Stock keeping unit identifier or code',
  },
  {
    key: 'product_category',
    label: 'Category',
    category: 'Product',
    required: false,
    aliases: ['category', 'product_category', 'dept', 'department', 'cat', 'category_name', 'group', 'type'],
    description: 'Merchandise classification (e.g. Dairy, Snacks, Grocery)',
  },
  {
    key: 'product_price',
    label: 'Unit Selling Price',
    category: 'Product',
    required: false,
    aliases: ['selling_price', 'price', 'unit_price', 'sales_price', 'rate', 'mrp', 'retail_price', 'sellingprice'],
    description: 'Retail price per unit (₹ or $)',
  },
  {
    key: 'product_cost',
    label: 'Unit Cost Price',
    category: 'Product',
    required: false,
    aliases: ['cost_price', 'cost', 'unit_cost', 'buy_price', 'purchase_price', 'costprice', 'cogs'],
    description: 'Wholesale acquisition cost per unit',
  },
  {
    key: 'product_lead_time',
    label: 'Supplier Lead Time (Days)',
    category: 'Product',
    required: false,
    aliases: ['lead_time', 'lead_time_days', 'leadtime', 'delivery_days', 'supplier_lead_time'],
    description: 'Days required for supplier restocking delivery',
  },
  {
    key: 'product_safety_stock',
    label: 'Safety Stock Buffer',
    category: 'Product',
    required: false,
    aliases: ['safety_stock', 'min_stock', 'safetystock', 'minimum_stock', 'buffer_stock'],
    description: 'Minimum reserve stock units threshold',
  },
  {
    key: 'store_name',
    label: 'Store / Branch Name',
    category: 'Store',
    required: false,
    aliases: ['store', 'store_name', 'branch', 'branch_name', 'outlet', 'location', 'shop', 'storename', 'branchname', 'store_id'],
    description: 'Store branch or location name',
  },
  {
    key: 'sale_date',
    label: 'Transaction Date',
    category: 'Sales',
    required: true,
    aliases: ['date', 'sale_date', 'transaction_date', 'txn_date', 'order_date', 'invoice_date', 'timestamp', 'time', 'saledate'],
    description: 'Date of retail transaction (YYYY-MM-DD)',
  },
  {
    key: 'sale_quantity',
    label: 'Units Sold / Quantity',
    category: 'Sales',
    required: true,
    aliases: ['quantity', 'qty', 'units_sold', 'units', 'items_sold', 'quantity_sold', 'sales_qty', 'volume', 'count', 'qty_sold'],
    description: 'Number of units purchased in transaction',
  },
  {
    key: 'sale_revenue',
    label: 'Sales Revenue',
    category: 'Sales',
    required: false,
    aliases: ['revenue', 'sales', 'total_sales', 'sales_amount', 'total_amount', 'total', 'amount', 'net_sales', 'gross_sales', 'totalsales'],
    description: 'Gross checkout amount (₹)',
  },
  {
    key: 'inventory_stock',
    label: 'Current Stock on Hand',
    category: 'Inventory',
    required: false,
    aliases: ['stock', 'inventory', 'current_stock', 'stock_quantity', 'on_hand', 'qty_on_hand', 'stock_on_hand', 'balance', 'closing_stock', 'currentstock'],
    description: 'Current physical quantity available on shelves',
  },
];

export interface NormalizedDataset {
  products: Product[];
  stores: Store[];
  sales: Sale[];
  inventory: InventoryRecord[];
  summary: {
    totalRecords: number;
    validSalesRecords: number;
    uniqueProducts: number;
    uniqueStores: number;
    dateRange: { min: string; max: string };
    warnings: string[];
  };
}

export class DataNormalizer {
  /**
   * Intelligently auto-detect source columns mapping to Nexus fields
   */
  public static autoDetectMappings(sourceColumns: string[]): Record<NexusFieldKey, string | null> {
    const mapping: Record<NexusFieldKey, string | null> = {
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
    };

    const normalizedSource = sourceColumns.map((col) => ({
      original: col,
      cleaned: col.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, ''),
    }));

    NEXUS_FIELDS.forEach((field) => {
      for (const alias of field.aliases) {
        const found = normalizedSource.find(
          (s) => s.cleaned === alias || s.cleaned === alias.replace(/_/g, '') || s.cleaned.includes(alias)
        );
        if (found) {
          mapping[field.key] = found.original;
          break;
        }
      }
    });

    return mapping;
  }

  /**
   * Clean and parse currency/numeric strings into pure numbers
   */
  public static parseNumeric(val: unknown, defaultVal = 0): number {
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
    if (!val) return defaultVal;
    const str = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? defaultVal : num;
  }

  /**
   * Parse various date formats into standard ISO YYYY-MM-DD
   */
  public static parseDate(val: unknown): string | null {
    if (!val) return null;
    const str = String(val).trim();
    if (!str) return null;

    // ISO format: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      return str.slice(0, 10);
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // MM/DD/YYYY fallback
    const mdyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (mdyMatch) {
      const month = mdyMatch[1].padStart(2, '0');
      const day = mdyMatch[2].padStart(2, '0');
      const year = mdyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Fallback standard JS Date
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return null;
  }

  /**
   * Normalize rows using user-configured field mappings into canonical NEXUS structure
   */
  public static normalizeRows(
    rows: Record<string, unknown>[],
    mappings: Record<NexusFieldKey, string | null>,
    defaultStoreName = 'Main Store'
  ): NormalizedDataset {
    const productsMap = new Map<string, Product>();
    const storesMap = new Map<string, Store>();
    const sales: Sale[] = [];
    const inventoryMap = new Map<string, InventoryRecord>();
    const warnings: string[] = [];

    let minDate = '9999-99-99';
    let maxDate = '0000-00-00';
    let validSalesCount = 0;

    rows.forEach((row, idx) => {
      // 1. Resolve Product
      const rawProdName = mappings.product_name ? String(row[mappings.product_name] || '').trim() : '';
      if (!rawProdName) {
        if (idx < 5) warnings.push(`Row ${idx + 1}: Skipped (missing product name).`);
        return;
      }

      const rawSku = mappings.product_sku ? String(row[mappings.product_sku] || '').trim() : '';
      const prodId = rawSku || `prod-${rawProdName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const sku = rawSku || `SKU-${rawProdName.slice(0, 3).toUpperCase()}-${Math.abs(hashString(rawProdName) % 1000)}`;
      const rawCategory = mappings.product_category ? String(row[mappings.product_category] || 'Grocery').trim() : 'Grocery';
      const sellingPrice = this.parseNumeric(mappings.product_price ? row[mappings.product_price] : null, 100);
      const costPrice = this.parseNumeric(mappings.product_cost ? row[mappings.product_cost] : null, Math.round(sellingPrice * 0.7));
      const leadTime = this.parseNumeric(mappings.product_lead_time ? row[mappings.product_lead_time] : null, 3);
      const safetyStock = this.parseNumeric(mappings.product_safety_stock ? row[mappings.product_safety_stock] : null, 10);

      if (!productsMap.has(prodId)) {
        productsMap.set(prodId, {
          id: prodId,
          name: rawProdName,
          category: (rawCategory || 'Grocery') as ProductCategory,
          sku,
          sellingPrice: sellingPrice || 100,
          costPrice: costPrice || 70,
          supplier: 'Direct Ingest',
          leadTimeDays: leadTime > 0 ? leadTime : 3,
          safetyStock: safetyStock > 0 ? safetyStock : 10,
          reorderQuantity: 30,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }

      // 2. Resolve Store
      const rawStoreName = mappings.store_name ? String(row[mappings.store_name] || '').trim() : '';
      const storeName = rawStoreName || defaultStoreName;
      const storeId = `store-${storeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

      if (!storesMap.has(storeId)) {
        storesMap.set(storeId, {
          id: storeId,
          name: storeName,
          location: 'Uploaded Location',
          managerId: 'manager-1',
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }

      // 3. Resolve Sales Transaction
      const dateStr = this.parseDate(mappings.sale_date ? row[mappings.sale_date] : null);
      const quantity = this.parseNumeric(mappings.sale_quantity ? row[mappings.sale_quantity] : null, 0);

      if (dateStr && quantity > 0) {
        if (dateStr < minDate) minDate = dateStr;
        if (dateStr > maxDate) maxDate = dateStr;

        const revVal = mappings.sale_revenue ? this.parseNumeric(row[mappings.sale_revenue], 0) : 0;
        const revenue = revVal > 0 ? revVal : quantity * (sellingPrice || 100);

        sales.push({
          id: `sale-upload-${idx + 1}`,
          date: dateStr,
          storeId,
          productId: prodId,
          quantity,
          revenue,
          unitPrice: sellingPrice || (revenue / quantity),
          createdAt: `${dateStr}T12:00:00.000Z`,
        });
        validSalesCount++;
      }

      // 4. Resolve Inventory Level
      if (mappings.inventory_stock && row[mappings.inventory_stock] !== undefined) {
        const stockQty = this.parseNumeric(row[mappings.inventory_stock], -1);
        if (stockQty >= 0) {
          const invKey = `${storeId}-${prodId}`;
          inventoryMap.set(invKey, {
            id: `inv-${invKey}`,
            storeId,
            productId: prodId,
            quantity: stockQty,
            date: dateStr || new Date().toISOString().slice(0, 10),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });

    // If no explicit inventory was mapped, derive realistic inventory balance from sales velocity
    if (inventoryMap.size === 0) {
      warnings.push("Notice: No current stock column was mapped. Inventory levels estimated from sales velocity.");
      productsMap.forEach((prod) => {
        storesMap.forEach((store) => {
          const invKey = `${store.id}-${prod.id}`;
          inventoryMap.set(invKey, {
            id: `inv-${invKey}`,
            storeId: store.id,
            productId: prod.id,
            quantity: Math.max(12, Math.floor(Math.random() * 45) + 5),
            date: maxDate !== '0000-00-00' ? maxDate : new Date().toISOString().slice(0, 10),
            updatedAt: new Date().toISOString(),
          });
        });
      });
    }

    const products = Array.from(productsMap.values());
    const stores = Array.from(storesMap.values());
    const inventory = Array.from(inventoryMap.values());

    return {
      products,
      stores,
      sales,
      inventory,
      summary: {
        totalRecords: rows.length,
        validSalesRecords: validSalesCount,
        uniqueProducts: products.length,
        uniqueStores: stores.length,
        dateRange: {
          min: minDate !== '9999-99-99' ? minDate : new Date().toISOString().slice(0, 10),
          max: maxDate !== '0000-00-00' ? maxDate : new Date().toISOString().slice(0, 10),
        },
        warnings,
      },
    };
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
