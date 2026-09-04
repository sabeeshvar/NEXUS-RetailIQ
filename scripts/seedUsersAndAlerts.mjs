import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../serviceAccountKey.json'), 'utf8'));

initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = getFirestore();

async function run() {
  console.log('[Firestore] Seeding users and alerts collections...');

  // Seed Users
  const users = [
    {
      uid: 'mgr-1',
      name: 'Ramesh Kumar',
      email: 'manager.dharapuram@nexusretail.com',
      role: 'manager',
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      uid: 'mgr-2',
      name: 'Priya Sundaram',
      email: 'manager.coimbatore@nexusretail.com',
      role: 'manager',
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      uid: 'admin-1',
      name: 'System Administrator',
      email: 'admin@nexusretail.com',
      role: 'admin',
      createdAt: FieldValue.serverTimestamp(),
    },
  ];

  const userBatch = db.batch();
  users.forEach((u) => {
    userBatch.set(db.collection('users').doc(u.uid), u);
  });
  await userBatch.commit();
  console.log(`✓ Seeded ${users.length} users.`);

  // Seed Alerts
  const alerts = [
    {
      id: 'alert-stockout-prod-1-store-1',
      type: 'STOCK_OUT',
      severity: 'CRITICAL',
      storeId: 'store-1',
      productId: 'prod-1',
      title: 'Critical Stock-Out Risk: Aavin Milk 1L',
      description: 'Current stock (18 units) projected to deplete in 2.1 days at velocity of 8.6 units/day.',
      metrics: {
        currentStock: 18,
        avgDailySales: 8.6,
        daysRemaining: 2.1,
        reorderPoint: 32,
      },
      recommendation: 'Place immediate replenishment order for 50 units today.',
      assumptions: ['Demand velocity estimated using trailing 7-day sales.', 'Supplier lead time is 2 days.'],
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      id: 'alert-overstock-prod-14-store-1',
      type: 'OVERSTOCK',
      severity: 'WARNING',
      storeId: 'store-1',
      productId: 'prod-14',
      title: 'Excess Inventory: Fortune Sunlite Sunflower Oil 1L',
      description: 'Holding 165 units representing ~71 days of forward demand.',
      metrics: {
        currentStock: 165,
        avgDailySales: 2.3,
        daysRemaining: 71.7,
        holdingValue: 20460,
      },
      recommendation: 'Pause upcoming purchase orders and reallocate stock to high-turnover stores.',
      assumptions: ['Coverage exceeding 45 days is classified as excess working capital lockup.'],
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      id: 'alert-spike-prod-8-store-1',
      type: 'SALES_SPIKE',
      severity: 'INFO',
      storeId: 'store-1',
      productId: 'prod-8',
      title: 'Sales Surge (+120%): Parle-G Glucose Biscuits 800g',
      description: "Today's sales surged significantly above the 7-day moving average.",
      metrics: {
        currentSales: 24,
        baselineSales: 11,
        percentageChange: 118.2,
      },
      recommendation: 'Ensure fast shelf replenishment from backroom reserves to prevent midday stockout.',
      assumptions: ['Baseline calculated using 7-day moving average.'],
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    },
  ];

  const alertBatch = db.batch();
  alerts.forEach((a) => {
    alertBatch.set(db.collection('alerts').doc(a.id), a);
  });
  await alertBatch.commit();
  console.log(`✓ Seeded ${alerts.length} initial alerts.`);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
