import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

const products = [
  { name: 'Aavin Toned Milk 500ml', sku: 'AAV-MILK-500', category: 'Dairy', price: 25, cost: 21, leadTime: 2, safetyStock: 20, initialStockStore1: 4, initialStockStore2: 35 }, // Low stock / stockout risk in store 1
  { name: 'Nandini Full Cream Milk 1L', sku: 'NAN-MILK-1000', category: 'Dairy', price: 54, cost: 46, leadTime: 2, safetyStock: 15, initialStockStore1: 6, initialStockStore2: 40 }, // Stockout risk in store 1
  { name: 'Tata Tea Gold 250g', sku: 'TAT-TEA-250', category: 'Beverages', price: 160, cost: 130, leadTime: 4, safetyStock: 12, initialStockStore1: 28, initialStockStore2: 30 },
  { name: 'Bru Instant Coffee 100g', sku: 'BRU-COF-100', category: 'Beverages', price: 210, cost: 175, leadTime: 5, safetyStock: 10, initialStockStore1: 22, initialStockStore2: 24 },
  { name: 'Aashirvaad Shudh Chakki Atta 5kg', sku: 'AAS-ATTA-5KG', category: 'Staples', price: 265, cost: 225, leadTime: 4, safetyStock: 15, initialStockStore1: 18, initialStockStore2: 25 },
  { name: 'Fortune Sunlite Sunflower Oil 1L', sku: 'FOR-OIL-1L', category: 'Staples', price: 145, cost: 122, leadTime: 3, safetyStock: 20, initialStockStore1: 32, initialStockStore2: 35 },
  { name: 'Parle-G Gold Biscuits 1kg', sku: 'PAR-GLD-1KG', category: 'Snacks', price: 120, cost: 95, leadTime: 3, safetyStock: 15, initialStockStore1: 45, initialStockStore2: 50 },
  { name: 'Maggi 2-Minute Noodles 420g', sku: 'MAG-NOD-420', category: 'Snacks', price: 95, cost: 78, leadTime: 3, safetyStock: 25, initialStockStore1: 60, initialStockStore2: 70 },
  { name: 'Britannia Good Day Butter 200g', sku: 'BRI-GDB-200', category: 'Snacks', price: 45, cost: 36, leadTime: 3, safetyStock: 20, initialStockStore1: 40, initialStockStore2: 42 },
  { name: 'Surf Excel Easy Wash 1kg', sku: 'SRF-WSH-1KG', category: 'Household', price: 140, cost: 115, leadTime: 5, safetyStock: 12, initialStockStore1: 25, initialStockStore2: 28 },
  { name: 'Dettol Original Soap 125g', sku: 'DET-SOP-125', category: 'Personal Care', price: 58, cost: 46, leadTime: 4, safetyStock: 15, initialStockStore1: 300, initialStockStore2: 280 }, // Overstocked item
  { name: 'Colgate Strong Teeth 200g', sku: 'COL-PST-200', category: 'Personal Care', price: 115, cost: 92, leadTime: 4, safetyStock: 10, initialStockStore1: 45, initialStockStore2: 40 }  // Slow mover
];

const stores = [
  { id: 'store-dt', name: 'Downtown Superstore' },
  { id: 'store-wm', name: 'Westside Mall' }
];

// Generate 35 days of sales records
const startDate = new Date('2024-05-01');
const numDays = 35;

const csvRows = [
  'product_name,sku,category,store_name,sale_date,quantity,revenue,current_stock,selling_price,cost_price,lead_time_days,safety_stock'
];

const allRecords = [];

for (let d = 0; d < numDays; d++) {
  const currentDate = new Date(startDate.getTime() + d * 24 * 60 * 60 * 1000);
  const dateStr = currentDate.toISOString().slice(0, 10);
  const isLatestDay = (d === numDays - 1);

  for (const store of stores) {
    for (const p of products) {
      let baseQty = 4;
      if (p.category === 'Dairy') baseQty = 7;
      if (p.category === 'Snacks') baseQty = 6;
      if (p.sku === 'COL-PST-200') baseQty = 0.2; // very slow mover
      if (p.sku === 'DET-SOP-125') baseQty = 1; // slow mover with high stock -> overstock

      // Add a spike on latest day for Maggi Noodles
      let qty = Math.max(0, Math.round(baseQty + (Math.sin(d + (store.id === 'store-dt' ? 1 : 2)) * 2)));
      if (p.sku === 'COL-PST-200') {
        qty = (d % 6 === 0) ? 1 : 0;
      }
      if (isLatestDay && p.sku === 'MAG-NOD-420') {
        qty = 22; // huge surge / spike
      }

      const rev = qty * p.price;
      const stock = store.id === 'store-dt' ? p.initialStockStore1 : p.initialStockStore2;

      allRecords.push({
        product: p.name,
        sku: p.sku,
        category: p.category,
        store: store.name,
        date: dateStr,
        quantity: qty,
        revenue: rev,
        stock: stock,
        price: p.price,
        cost: p.cost,
        leadTime: p.leadTime,
        safetyStock: p.safetyStock
      });

      csvRows.push(
        `"${p.name}","${p.sku}","${p.category}","${store.name}","${dateStr}",${qty},${rev},${stock},${p.price},${p.cost},${p.leadTime},${p.safetyStock}`
      );
    }
  }
}

// Write public/sample_retail_data.csv
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'sample_retail_data.csv'), csvRows.join('\n'), 'utf8');
console.log(`Generated public/sample_retail_data.csv with ${allRecords.length} sales records across 12 products, 2 stores, 35 days.`);

// Also generate SQLite database: public/sample_retail_data.db
async function buildSqliteDb() {
  const wasmBinary = fs.readFileSync(path.join(publicDir, 'sql-wasm.wasm'));
  const SQL = await initSqlJs({
    wasmBinary
  });

  const db = new SQL.Database();
  
  // Create sales table
  db.run(`
    CREATE TABLE sales_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_name TEXT,
      sku TEXT,
      category TEXT,
      store_name TEXT,
      sale_date TEXT,
      units_sold INTEGER,
      sales_revenue REAL,
      current_stock INTEGER,
      unit_price REAL,
      unit_cost REAL,
      lead_time_days INTEGER,
      safety_stock INTEGER
    );
  `);

  const stmt = db.prepare(`
    INSERT INTO sales_transactions (
      product_name, sku, category, store_name, sale_date, units_sold,
      sales_revenue, current_stock, unit_price, unit_cost, lead_time_days, safety_stock
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  for (const r of allRecords) {
    stmt.run([
      r.product,
      r.sku,
      r.category,
      r.store,
      r.date,
      r.quantity,
      r.revenue,
      r.stock,
      r.price,
      r.cost,
      r.leadTime,
      r.safetyStock
    ]);
  }
  stmt.free();

  const data = db.export();
  fs.writeFileSync(path.join(publicDir, 'sample_retail_data.db'), Buffer.from(data));
  console.log(`Generated public/sample_retail_data.db with ${allRecords.length} records in sales_transactions.`);
}

buildSqliteDb().catch(console.error);
