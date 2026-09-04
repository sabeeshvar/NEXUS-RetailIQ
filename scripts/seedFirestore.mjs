import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('serviceAccountKey.json not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = getFirestore();

// 3 Stores
const stores = [
  {
    id: 'store-1',
    name: 'Dharapuram Main',
    location: 'Main Bazaar Road, Dharapuram, TN',
    managerId: 'mgr-1',
    status: 'active',
  },
  {
    id: 'store-2',
    name: 'Coimbatore Central',
    location: 'Cross Cut Road, Gandhipuram, Coimbatore, TN',
    managerId: 'mgr-2',
    status: 'active',
  },
  {
    id: 'store-3',
    name: 'Erode Market',
    location: 'Brough Road, Erode, TN',
    managerId: 'mgr-3',
    status: 'active',
  },
];

// 24 Products
const products = [
  { id: 'prod-1', name: 'Aavin Milk 1L (Standardized)', category: 'Dairy', sku: 'DAI-AAV-001', sellingPrice: 54, costPrice: 46, supplier: 'Aavin Tamil Nadu Dairy Coop', leadTimeDays: 2, safetyStock: 15, reorderQuantity: 50, status: 'active' },
  { id: 'prod-2', name: 'Amul Butter 500g', category: 'Dairy', sku: 'DAI-AMU-002', sellingPrice: 275, costPrice: 240, supplier: 'Gujarat Milk Federation', leadTimeDays: 4, safetyStock: 12, reorderQuantity: 30, status: 'active' },
  { id: 'prod-3', name: 'Heritage Cow Ghee 500ml', category: 'Dairy', sku: 'DAI-HER-003', sellingPrice: 380, costPrice: 320, supplier: 'Heritage Foods Ltd', leadTimeDays: 5, safetyStock: 8, reorderQuantity: 20, status: 'active' },
  { id: 'prod-4', name: 'Coca-Cola 750ml PET', category: 'Beverages', sku: 'BEV-CC-004', sellingPrice: 40, costPrice: 31, supplier: 'Hindustan Coca-Cola Beverages', leadTimeDays: 3, safetyStock: 20, reorderQuantity: 60, status: 'active' },
  { id: 'prod-5', name: 'Thums Up 750ml PET', category: 'Beverages', sku: 'BEV-TU-005', sellingPrice: 40, costPrice: 31, supplier: 'Hindustan Coca-Cola Beverages', leadTimeDays: 3, safetyStock: 18, reorderQuantity: 50, status: 'active' },
  { id: 'prod-6', name: 'Red Label Tea 500g', category: 'Beverages', sku: 'BEV-HUL-006', sellingPrice: 260, costPrice: 215, supplier: 'Hindustan Unilever Ltd', leadTimeDays: 4, safetyStock: 15, reorderQuantity: 35, status: 'active' },
  { id: 'prod-7', name: 'Bru Instant Coffee 200g Pouch', category: 'Beverages', sku: 'BEV-HUL-007', sellingPrice: 340, costPrice: 285, supplier: 'Hindustan Unilever Ltd', leadTimeDays: 5, safetyStock: 10, reorderQuantity: 25, status: 'active' },
  { id: 'prod-8', name: 'Parle-G Glucose Biscuits 800g Super Saver', category: 'Snacks', sku: 'SNK-PAR-008', sellingPrice: 85, costPrice: 68, supplier: 'Parle Products Ltd', leadTimeDays: 3, safetyStock: 25, reorderQuantity: 80, status: 'active' },
  { id: 'prod-9', name: 'Britannia Good Day Butter 200g', category: 'Snacks', sku: 'SNK-BRI-009', sellingPrice: 45, costPrice: 35, supplier: 'Britannia Industries Ltd', leadTimeDays: 3, safetyStock: 20, reorderQuantity: 60, status: 'active' },
  { id: 'prod-10', name: 'Maggi 2-Minute Masala Noodles 4-Pack (280g)', category: 'Snacks', sku: 'SNK-NES-010', sellingPrice: 56, costPrice: 44, supplier: 'Nestle India Ltd', leadTimeDays: 3, safetyStock: 25, reorderQuantity: 70, status: 'active' },
  { id: 'prod-11', name: "Lay's India's Magic Masala 52g", category: 'Snacks', sku: 'SNK-PEP-011', sellingPrice: 20, costPrice: 15, supplier: 'PepsiCo India', leadTimeDays: 2, safetyStock: 30, reorderQuantity: 100, status: 'active' },
  { id: 'prod-12', name: 'Aashirvaad Shudh Chakki Atta 5kg', category: 'Grocery', sku: 'GRO-ITC-012', sellingPrice: 260, costPrice: 220, supplier: 'ITC Limited', leadTimeDays: 4, safetyStock: 15, reorderQuantity: 40, status: 'active' },
  { id: 'prod-13', name: 'Tata Salt Vacuum Evaporated 1kg', category: 'Grocery', sku: 'GRO-TAT-013', sellingPrice: 28, costPrice: 22, supplier: 'Tata Consumer Products', leadTimeDays: 4, safetyStock: 25, reorderQuantity: 60, status: 'active' },
  { id: 'prod-14', name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch', category: 'Grocery', sku: 'GRO-AWL-014', sellingPrice: 145, costPrice: 124, supplier: 'Adani Wilmar Ltd', leadTimeDays: 5, safetyStock: 20, reorderQuantity: 50, status: 'active' },
  { id: 'prod-15', name: 'Royal Ponni Boiled Rice 25kg Bag', category: 'Grocery', sku: 'GRO-RYL-015', sellingPrice: 1450, costPrice: 1250, supplier: 'South India Rice Mills', leadTimeDays: 6, safetyStock: 8, reorderQuantity: 25, status: 'active' },
  { id: 'prod-16', name: 'Toor Dal Premium Unpolished 1kg', category: 'Grocery', sku: 'GRO-DAL-016', sellingPrice: 175, costPrice: 145, supplier: 'National Agro Commodities', leadTimeDays: 4, safetyStock: 15, reorderQuantity: 40, status: 'active' },
  { id: 'prod-17', name: 'Surf Excel Quick Wash Detergent Powder 1kg', category: 'Household', sku: 'HOU-HUL-017', sellingPrice: 195, costPrice: 158, supplier: 'Hindustan Unilever Ltd', leadTimeDays: 4, safetyStock: 15, reorderQuantity: 35, status: 'active' },
  { id: 'prod-18', name: 'Vim Dishwash Bar 300g (Pack of 3)', category: 'Household', sku: 'HOU-HUL-018', sellingPrice: 48, costPrice: 38, supplier: 'Hindustan Unilever Ltd', leadTimeDays: 3, safetyStock: 25, reorderQuantity: 60, status: 'active' },
  { id: 'prod-19', name: 'Lizol Disinfectant Floor Cleaner Citrus 500ml', category: 'Household', sku: 'HOU-REC-019', sellingPrice: 115, costPrice: 92, supplier: 'Reckitt Benckiser India', leadTimeDays: 5, safetyStock: 12, reorderQuantity: 30, status: 'active' },
  { id: 'prod-20', name: 'Colgate Strong Teeth Toothpaste 200g', category: 'Personal Care', sku: 'PER-COL-020', sellingPrice: 110, costPrice: 85, supplier: 'Colgate-Palmolive India', leadTimeDays: 3, safetyStock: 15, reorderQuantity: 40, status: 'active' },
  { id: 'prod-21', name: 'Dettol Original Bathing Soap 125g (Buy 3 Get 1)', category: 'Personal Care', sku: 'PER-REC-021', sellingPrice: 168, costPrice: 135, supplier: 'Reckitt Benckiser India', leadTimeDays: 4, safetyStock: 18, reorderQuantity: 45, status: 'active' },
  { id: 'prod-22', name: 'Clinic Plus Strong & Long Shampoo 340ml', category: 'Personal Care', sku: 'PER-HUL-022', sellingPrice: 185, costPrice: 148, supplier: 'Hindustan Unilever Ltd', leadTimeDays: 4, safetyStock: 12, reorderQuantity: 30, status: 'active' },
  { id: 'prod-23', name: 'Classmate Pulse Ruled Notebook 172 Pages', category: 'Stationery', sku: 'STA-ITC-023', sellingPrice: 65, costPrice: 48, supplier: 'ITC Education and Stationery', leadTimeDays: 4, safetyStock: 20, reorderQuantity: 50, status: 'active' },
  { id: 'prod-24', name: 'Reynolds 045 Fine Carbure Ballpoint Pen (Pack of 5)', category: 'Stationery', sku: 'STA-REY-024', sellingPrice: 50, costPrice: 36, supplier: 'Reynolds Pens India', leadTimeDays: 3, safetyStock: 30, reorderQuantity: 80, status: 'active' },
];

async function seed() {
  console.log(`[Firestore Seed] Connecting to Firebase project: ${serviceAccount.project_id}...`);

  // 1. Upload Stores
  console.log('[Firestore Seed] Uploading stores...');
  const storeBatch = db.batch();
  for (const s of stores) {
    storeBatch.set(db.collection('stores').doc(s.id), {
      ...s,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await storeBatch.commit();
  console.log(`[Firestore Seed] ✓ ${stores.length} stores successfully committed.`);

  // 2. Upload Products
  console.log('[Firestore Seed] Uploading products...');
  const prodBatch = db.batch();
  for (const p of products) {
    prodBatch.set(db.collection('products').doc(p.id), {
      ...p,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  await prodBatch.commit();
  console.log(`[Firestore Seed] ✓ ${products.length} products successfully committed.`);

  // 3. Upload Inventory
  console.log('[Firestore Seed] Uploading current store inventory levels...');
  const invBatch = db.batch();
  const todayStr = new Date().toISOString().split('T')[0];

  for (const store of stores) {
    for (const prod of products) {
      let currentStock = 35;
      if (prod.id === 'prod-1' && store.id === 'store-1') currentStock = 18; // 2.1 days runway!
      else if (prod.id === 'prod-4' && store.id === 'store-1') currentStock = 21; // 1.75 days runway!
      else if (prod.id === 'prod-14') currentStock = store.id === 'store-1' ? 165 : 185; // Overstock
      else if (prod.id === 'prod-3') currentStock = 42; // Slow moving

      const invDocId = `inv-${store.id}-${prod.id}`;
      invBatch.set(db.collection('inventory').doc(invDocId), {
        id: invDocId,
        storeId: store.id,
        productId: prod.id,
        quantity: currentStock,
        date: todayStr,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
  await invBatch.commit();
  console.log('[Firestore Seed] ✓ Current inventory levels successfully committed.');

  // 4. Upload Recent 7-Day POS Sales Samples
  console.log('[Firestore Seed] Uploading recent POS sales records to Firestore...');
  const salesBatch = db.batch();
  let salesCount = 0;

  for (let d = 6; d >= 0; d--) {
    const dDate = new Date();
    dDate.setDate(dDate.getDate() - d);
    const dateStr = dDate.toISOString().split('T')[0];

    for (const store of stores) {
      for (const prod of products.slice(0, 10)) {
        let qty = Math.floor(Math.random() * 8) + 3;
        if (d === 0 && prod.id === 'prod-8') qty = 24; // Parle-G surge
        if (d === 0 && prod.id === 'prod-5') qty = 2;  // Thums Up drop

        const saleDocId = `sale-${store.id}-${prod.id}-${dateStr}`;
        salesBatch.set(db.collection('sales').doc(saleDocId), {
          id: saleDocId,
          date: dateStr,
          storeId: store.id,
          productId: prod.id,
          quantity: qty,
          revenue: qty * prod.sellingPrice,
          unitPrice: prod.sellingPrice,
          createdAt: FieldValue.serverTimestamp(),
        });
        salesCount++;
      }
    }
  }
  await salesBatch.commit();
  console.log(`[Firestore Seed] ✓ ${salesCount} sales records successfully committed.`);

  console.log('========================================================');
  console.log('LIVE FIRESTORE DATABASE FULLY POPULATED!');
  console.log(`Project: ${serviceAccount.project_id}`);
  console.log('Collections: stores, products, inventory, sales');
  console.log('========================================================');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Firestore Seed Error]:', err);
  process.exit(1);
});
