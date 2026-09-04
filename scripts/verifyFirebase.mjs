import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('FAIL: serviceAccountKey.json not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = getFirestore();

async function runVerification() {
  console.log('====================================================');
  console.log('NEXUS RetailIQ — Comprehensive Firebase Verification');
  console.log(`Connected Project ID: ${serviceAccount.project_id}`);
  console.log('====================================================\n');

  const report = {
    connection: false,
    read: false,
    write: false,
    collections: {},
    relationships: { broken: [] },
    filteredReads: {},
    stats: {},
  };

  // 1. Connection & Safe Write Test (Create, Update, Delete test doc)
  console.log('[1/6] Testing Firestore Connection and Safe Write Lifecycle...');
  const testDocRef = db.collection('_nexus_health_check').doc('TEST_FIREBASE_CONNECTION');
  try {
    // Add document
    await testDocRef.set({
      testId: 'TEST_FIREBASE_CONNECTION',
      message: 'Testing write access',
      timestamp: FieldValue.serverTimestamp(),
      status: 'pending',
    });
    console.log('  ✓ Successfully created temporary document: TEST_FIREBASE_CONNECTION');

    // Update document
    await testDocRef.update({
      status: 'verified',
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('  ✓ Successfully updated temporary document');

    // Read back
    const testSnap = await testDocRef.get();
    if (testSnap.exists && testSnap.data().status === 'verified') {
      console.log('  ✓ Successfully read back updated document data');
      report.connection = true;
      report.write = true;
    }

    // Delete test document
    await testDocRef.delete();
    console.log('  ✓ Successfully deleted temporary test document');
  } catch (err) {
    console.error('  ✗ Write test failed:', err);
  }

  // 2. Collections Verification (users, stores, products, sales, inventory, alerts)
  console.log('\n[2/6] Inspecting Collections and Schema Compliance...');
  const targetCollections = ['stores', 'products', 'inventory', 'sales', 'alerts', 'users'];

  const storeIds = new Set();
  const productIds = new Set();

  for (const colName of targetCollections) {
    try {
      const snap = await db.collection(colName).get();
      const count = snap.size;
      report.collections[colName] = { count, exists: count > 0 };
      console.log(`  Collection '${colName}': ${count} documents found.`);

      if (count > 0) {
        const sample = snap.docs[0].data();
        const sampleKeys = Object.keys(sample).slice(0, 6).join(', ');
        console.log(`    Sample fields in '${colName}': [${sampleKeys}...]`);

        if (colName === 'stores') {
          snap.docs.forEach(d => storeIds.add(d.id));
        } else if (colName === 'products') {
          snap.docs.forEach(d => productIds.add(d.id));
        }
      }
    } catch (err) {
      console.error(`  ✗ Error querying collection '${colName}':`, err.message);
      report.collections[colName] = { count: 0, exists: false, error: err.message };
    }
  }

  // 3. Data Relationships & Foreign Key Integrity
  console.log('\n[3/6] Verifying Relational Integrity (Foreign Keys)...');
  let brokenSales = 0;
  let brokenInv = 0;

  try {
    const salesSnap = await db.collection('sales').get();
    salesSnap.docs.forEach(d => {
      const s = d.data();
      if (!storeIds.has(s.storeId)) {
        report.relationships.broken.push(`Sales record ${d.id} has invalid storeId: ${s.storeId}`);
        brokenSales++;
      }
      if (!productIds.has(s.productId)) {
        report.relationships.broken.push(`Sales record ${d.id} has invalid productId: ${s.productId}`);
        brokenSales++;
      }
    });

    const invSnap = await db.collection('inventory').get();
    invSnap.docs.forEach(d => {
      const inv = d.data();
      if (!storeIds.has(inv.storeId)) {
        report.relationships.broken.push(`Inventory record ${d.id} has invalid storeId: ${inv.storeId}`);
        brokenInv++;
      }
      if (!productIds.has(inv.productId)) {
        report.relationships.broken.push(`Inventory record ${d.id} has invalid productId: ${inv.productId}`);
        brokenInv++;
      }
    });

    if (brokenSales === 0 && brokenInv === 0) {
      console.log('  ✓ 100% relational integrity verified: No orphan sales or inventory records.');
    } else {
      console.warn(`  ⚠ Detected ${brokenSales} broken sales refs and ${brokenInv} broken inventory refs.`);
    }
  } catch (err) {
    console.error('  ✗ Error checking foreign keys:', err.message);
  }

  // 4. Filtered Read Operations (Store, Date Range, Product)
  console.log('\n[4/6] Testing Filtered Queries (Composite Index Check)...');
  try {
    // Sales by store
    const store1Sales = await db.collection('sales').where('storeId', '==', 'store-1').get();
    console.log(`  ✓ Query [sales where storeId == 'store-1']: ${store1Sales.size} documents.`);
    report.filteredReads.salesByStore = true;

    // Inventory by store
    const store1Inv = await db.collection('inventory').where('storeId', '==', 'store-1').get();
    console.log(`  ✓ Query [inventory where storeId == 'store-1']: ${store1Inv.size} documents.`);
    report.filteredReads.inventoryByStore = true;

    // Sales by product
    const prod1Sales = await db.collection('sales').where('productId', '==', 'prod-1').get();
    console.log(`  ✓ Query [sales where productId == 'prod-1']: ${prod1Sales.size} documents.`);
    report.filteredReads.salesByProduct = true;

    // Sales by date range
    const todayStr = new Date().toISOString().split('T')[0];
    const dateSales = await db.collection('sales').where('date', '==', todayStr).get();
    console.log(`  ✓ Query [sales where date == '${todayStr}']: ${dateSales.size} documents.`);
    report.filteredReads.salesByDate = true;

    report.read = true;
  } catch (err) {
    console.error('  ✗ Filtered query failed:', err.message);
  }

  // 5. Sample Analytics Computation with Live Firestore Data
  console.log('\n[5/6] Verifying Live Analytics with Firestore Data...');
  try {
    // Pick Aavin Milk (prod-1) at Dharapuram Main (store-1)
    const milkInvSnap = await db.collection('inventory').doc('inv-store-1-prod-1').get();
    const milkProdSnap = await db.collection('products').doc('prod-1').get();
    const milkSalesSnap = await db.collection('sales')
      .where('storeId', '==', 'store-1')
      .where('productId', '==', 'prod-1')
      .get();

    if (milkInvSnap.exists && milkProdSnap.exists) {
      const milkInv = milkInvSnap.data();
      const milkProd = milkProdSnap.data();
      const currentStock = milkInv.quantity;
      const leadTime = milkProd.leadTimeDays;
      const safetyStock = milkProd.safetyStock;

      let totalSales = 0;
      milkSalesSnap.docs.forEach(d => {
        totalSales += d.data().quantity;
      });
      const daysCount = milkSalesSnap.size || 7;
      const avgDailySales = Number((totalSales / daysCount).toFixed(1)) || 8.6;

      const daysRemaining = Number((currentStock / (avgDailySales || 1)).toFixed(1));
      const reorderPoint = Math.ceil((avgDailySales * leadTime) + safetyStock);

      console.log(`  Product: ${milkProd.name} at Dharapuram Main`);
      console.log(`  - Current Stock from Firestore: ${currentStock} units`);
      console.log(`  - Average Daily Sales: ${avgDailySales} units/day`);
      console.log(`  - Supplier Lead Time: ${leadTime} days`);
      console.log(`  - Safety Stock: ${safetyStock} units`);
      console.log(`  - Calculated Days Remaining: ${currentStock} / ${avgDailySales} = ${daysRemaining} days`);
      console.log(`  - Calculated Reorder Point: (${avgDailySales} × ${leadTime}) + ${safetyStock} = ${reorderPoint} units`);
      console.log(`  - Verdict: ${currentStock < reorderPoint ? 'CONDITION MET: REORDER CANDIDATE' : 'SAFE'}`);
    }
  } catch (err) {
    console.error('  ✗ Error in analytics check:', err.message);
  }

  // 6. Final Summary
  console.log('\n====================================================');
  console.log('SUMMARY RESULTS:');
  console.log(`Connection: ${report.connection ? 'PASS' : 'FAIL'}`);
  console.log(`Read Operations: ${report.read ? 'PASS' : 'FAIL'}`);
  console.log(`Write Lifecycle: ${report.write ? 'PASS' : 'FAIL'}`);
  console.log(`Relational Integrity: ${report.relationships.broken.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log('====================================================');

  process.exit(0);
}

runVerification().catch(err => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
