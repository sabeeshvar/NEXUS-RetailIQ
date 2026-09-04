import { Store, Product, Sale, InventoryRecord } from '../types';
import { format, subDays } from 'date-fns';

export const DEMO_STORES: Store[] = [
  {
    id: 'store-1',
    name: 'Dharapuram Main',
    location: 'Main Bazaar Road, Dharapuram, TN',
    managerId: 'mgr-1',
    status: 'active',
    createdAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: 'store-2',
    name: 'Coimbatore Central',
    location: 'Cross Cut Road, Gandhipuram, Coimbatore, TN',
    managerId: 'mgr-2',
    status: 'active',
    createdAt: '2024-01-10T00:00:00.000Z',
  },
  {
    id: 'store-3',
    name: 'Erode Market',
    location: 'Brough Road, Erode, TN',
    managerId: 'mgr-3',
    status: 'active',
    createdAt: '2024-02-01T00:00:00.000Z',
  },
];

export const DEMO_PRODUCTS: Product[] = [
  // Dairy
  {
    id: 'prod-1',
    name: 'Aavin Milk 1L (Standardized)',
    category: 'Dairy',
    sku: 'DAI-AAV-001',
    sellingPrice: 54,
    costPrice: 46,
    supplier: 'Aavin Tamil Nadu Dairy Coop',
    leadTimeDays: 2,
    safetyStock: 15,
    reorderQuantity: 50,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-2',
    name: 'Amul Butter 500g',
    category: 'Dairy',
    sku: 'DAI-AMU-002',
    sellingPrice: 275,
    costPrice: 240,
    supplier: 'Gujarat Milk Federation',
    leadTimeDays: 4,
    safetyStock: 12,
    reorderQuantity: 30,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-3',
    name: 'Heritage Cow Ghee 500ml',
    category: 'Dairy',
    sku: 'DAI-HER-003',
    sellingPrice: 380,
    costPrice: 320,
    supplier: 'Heritage Foods Ltd',
    leadTimeDays: 5,
    safetyStock: 8,
    reorderQuantity: 20,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },

  // Beverages
  {
    id: 'prod-4',
    name: 'Coca-Cola 750ml PET',
    category: 'Beverages',
    sku: 'BEV-CC-004',
    sellingPrice: 40,
    costPrice: 31,
    supplier: 'Hindustan Coca-Cola Beverages',
    leadTimeDays: 3,
    safetyStock: 20,
    reorderQuantity: 60,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-5',
    name: 'Thums Up 750ml PET',
    category: 'Beverages',
    sku: 'BEV-TU-005',
    sellingPrice: 40,
    costPrice: 31,
    supplier: 'Hindustan Coca-Cola Beverages',
    leadTimeDays: 3,
    safetyStock: 18,
    reorderQuantity: 50,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-6',
    name: 'Red Label Tea 500g',
    category: 'Beverages',
    sku: 'BEV-HUL-006',
    sellingPrice: 260,
    costPrice: 215,
    supplier: 'Hindustan Unilever Ltd',
    leadTimeDays: 4,
    safetyStock: 15,
    reorderQuantity: 35,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-7',
    name: 'Bru Instant Coffee 200g Pouch',
    category: 'Beverages',
    sku: 'BEV-HUL-007',
    sellingPrice: 340,
    costPrice: 285,
    supplier: 'Hindustan Unilever Ltd',
    leadTimeDays: 5,
    safetyStock: 10,
    reorderQuantity: 25,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },

  // Snacks & Biscuits
  {
    id: 'prod-8',
    name: 'Parle-G Glucose Biscuits 800g Super Saver',
    category: 'Snacks',
    sku: 'SNK-PAR-008',
    sellingPrice: 85,
    costPrice: 68,
    supplier: 'Parle Products Ltd',
    leadTimeDays: 3,
    safetyStock: 25,
    reorderQuantity: 80,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-9',
    name: 'Britannia Good Day Butter 200g',
    category: 'Snacks',
    sku: 'SNK-BRI-009',
    sellingPrice: 45,
    costPrice: 35,
    supplier: 'Britannia Industries Ltd',
    leadTimeDays: 3,
    safetyStock: 20,
    reorderQuantity: 60,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-10',
    name: 'Maggi 2-Minute Masala Noodles 4-Pack (280g)',
    category: 'Snacks',
    sku: 'SNK-NES-010',
    sellingPrice: 56,
    costPrice: 44,
    supplier: 'Nestle India Ltd',
    leadTimeDays: 3,
    safetyStock: 25,
    reorderQuantity: 70,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-11',
    name: "Lay's India's Magic Masala 52g",
    category: 'Snacks',
    sku: 'SNK-PEP-011',
    sellingPrice: 20,
    costPrice: 15,
    supplier: 'PepsiCo India',
    leadTimeDays: 2,
    safetyStock: 30,
    reorderQuantity: 100,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },

  // Grocery & Staples
  {
    id: 'prod-12',
    name: 'Aashirvaad Shudh Chakki Atta 5kg',
    category: 'Grocery',
    sku: 'GRO-ITC-012',
    sellingPrice: 260,
    costPrice: 220,
    supplier: 'ITC Limited',
    leadTimeDays: 4,
    safetyStock: 15,
    reorderQuantity: 40,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-13',
    name: 'Tata Salt Vacuum Evaporated 1kg',
    category: 'Grocery',
    sku: 'GRO-TAT-013',
    sellingPrice: 28,
    costPrice: 22,
    supplier: 'Tata Consumer Products',
    leadTimeDays: 4,
    safetyStock: 25,
    reorderQuantity: 60,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-14',
    name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch',
    category: 'Grocery',
    sku: 'GRO-AWL-014',
    sellingPrice: 145,
    costPrice: 124,
    supplier: 'Adani Wilmar Ltd',
    leadTimeDays: 5,
    safetyStock: 20,
    reorderQuantity: 50,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-15',
    name: 'Royal Ponni Boiled Rice 25kg Bag',
    category: 'Grocery',
    sku: 'GRO-RYL-015',
    sellingPrice: 1450,
    costPrice: 1250,
    supplier: 'South India Rice Mills',
    leadTimeDays: 6,
    safetyStock: 8,
    reorderQuantity: 25,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-16',
    name: 'Toor Dal Premium Unpolished 1kg',
    category: 'Grocery',
    sku: 'GRO-DAL-016',
    sellingPrice: 175,
    costPrice: 145,
    supplier: 'National Agro Commodities',
    leadTimeDays: 4,
    safetyStock: 15,
    reorderQuantity: 40,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },

  // Household & Cleaning
  {
    id: 'prod-17',
    name: 'Surf Excel Quick Wash Detergent Powder 1kg',
    category: 'Household',
    sku: 'HOU-HUL-017',
    sellingPrice: 195,
    costPrice: 158,
    supplier: 'Hindustan Unilever Ltd',
    leadTimeDays: 4,
    safetyStock: 15,
    reorderQuantity: 35,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-18',
    name: 'Vim Dishwash Bar 300g (Pack of 3)',
    category: 'Household',
    sku: 'HOU-HUL-018',
    sellingPrice: 48,
    costPrice: 38,
    supplier: 'Hindustan Unilever Ltd',
    leadTimeDays: 3,
    safetyStock: 25,
    reorderQuantity: 60,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-19',
    name: 'Lizol Disinfectant Floor Cleaner Citrus 500ml',
    category: 'Household',
    sku: 'HOU-REC-019',
    sellingPrice: 115,
    costPrice: 92,
    supplier: 'Reckitt Benckiser India',
    leadTimeDays: 5,
    safetyStock: 12,
    reorderQuantity: 30,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },

  // Personal Care
  {
    id: 'prod-20',
    name: 'Colgate Strong Teeth Toothpaste 200g',
    category: 'Personal Care',
    sku: 'PER-COL-020',
    sellingPrice: 110,
    costPrice: 85,
    supplier: 'Colgate-Palmolive India',
    leadTimeDays: 3,
    safetyStock: 15,
    reorderQuantity: 40,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-21',
    name: 'Dettol Original Bathing Soap 125g (Buy 3 Get 1)',
    category: 'Personal Care',
    sku: 'PER-REC-021',
    sellingPrice: 168,
    costPrice: 135,
    supplier: 'Reckitt Benckiser India',
    leadTimeDays: 4,
    safetyStock: 18,
    reorderQuantity: 45,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-22',
    name: 'Clinic Plus Strong & Long Shampoo 340ml',
    category: 'Personal Care',
    sku: 'PER-HUL-022',
    sellingPrice: 185,
    costPrice: 148,
    supplier: 'Hindustan Unilever Ltd',
    leadTimeDays: 4,
    safetyStock: 12,
    reorderQuantity: 30,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },

  // Stationery
  {
    id: 'prod-23',
    name: 'Classmate Pulse Ruled Notebook 172 Pages',
    category: 'Stationery',
    sku: 'STA-ITC-023',
    sellingPrice: 65,
    costPrice: 48,
    supplier: 'ITC Education and Stationery',
    leadTimeDays: 4,
    safetyStock: 20,
    reorderQuantity: 50,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-24',
    name: 'Reynolds 045 Fine Carbure Ballpoint Pen (Pack of 5)',
    category: 'Stationery',
    sku: 'STA-REY-024',
    sellingPrice: 50,
    costPrice: 36,
    supplier: 'Reynolds Pens India',
    leadTimeDays: 3,
    safetyStock: 30,
    reorderQuantity: 80,
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

/**
 * Generate 90 days of rich realistic retail sales and current inventory
 * Explicitly seeded with the 7 Hackathon PS03 testing scenarios!
 */
export function generateRetailDemoData(): {
  stores: Store[];
  products: Product[];
  sales: Sale[];
  inventory: InventoryRecord[];
} {
  const stores = DEMO_STORES;
  const products = DEMO_PRODUCTS;
  const sales: Sale[] = [];
  const inventory: InventoryRecord[] = [];

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Baseline multiplier for stores:
  // Store 2 (Coimbatore Central) has high volume (~1.8x)
  // Store 1 (Dharapuram Main) has medium volume (~1.0x)
  // Store 3 (Erode Market) has moderate/lower volume (~0.75x)
  const storeMultipliers: Record<string, number> = {
    'store-1': 1.0,
    'store-2': 1.75,
    'store-3': 0.75,
  };

  // Base daily sales velocity for products
  const baseVelocities: Record<string, number> = {
    'prod-1': 8.6,  // Aavin Milk (High fast-moving)
    'prod-2': 3.2,  // Butter
    'prod-3': 0.1,  // Ghee (Scenario 3: Slow mover)
    'prod-4': 12.0, // Coke (Fast-moving)
    'prod-5': 9.5,  // Thums Up (Scenario 5: Sales drop today)
    'prod-6': 4.1,  // Red Label Tea
    'prod-7': 2.2,  // Coffee
    'prod-8': 14.0, // Parle-G (Scenario 4: Sales surge/spike today)
    'prod-9': 8.4,  // Good Day
    'prod-10': 9.8, // Maggi
    'prod-11': 11.2,// Lays
    'prod-12': 5.0, // Atta
    'prod-13': 4.2, // Tata Salt
    'prod-14': 2.3, // Fortune Oil (Scenario 2: Overstock)
    'prod-15': 1.1, // Rice 25kg
    'prod-16': 3.5, // Dal
    'prod-17': 2.8, // Surf Excel
    'prod-18': 5.5, // Vim
    'prod-19': 2.0, // Lizol
    'prod-20': 4.4, // Toothpaste
    'prod-21': 4.0, // Dettol Soap
    'prod-22': 2.5, // Shampoo
    'prod-23': 3.0, // Notebook
    'prod-24': 6.0, // Pens
  };

  // Generate 90 days of transactions (Day 89 down to 0)
  for (let d = 89; d >= 0; d--) {
    const saleDate = subDays(today, d);
    const dateStr = format(saleDate, 'yyyy-MM-dd');
    const isToday = d === 0;
    const dayOfWeek = saleDate.getDay(); // 0 = Sunday, 6 = Saturday (weekend bump)
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.35 : 1.0;

    stores.forEach(store => {
      const storeMult = storeMultipliers[store.id] || 1.0;

      products.forEach(product => {
        const baseVel = baseVelocities[product.id] || 3.0;
        let expectedSales = baseVel * storeMult * weekendFactor;

        // Pseudo-random daily fluctuation ±25%
        const noise = 0.75 + (((d * 17 + parseInt(product.id.split('-')[1]) * 13) % 50) / 100);
        let dailyQty = Math.max(0, Math.round(expectedSales * noise));

        // Inject Scenario 4: Parle-G Surge on Today (+120% spike)
        if (isToday && product.id === 'prod-8') {
          dailyQty = Math.round(expectedSales * 2.2); // Huge spike
        }

        // Inject Scenario 5: Thums Up Drop on Today (-55% drop)
        if (isToday && product.id === 'prod-5') {
          dailyQty = Math.max(1, Math.round(expectedSales * 0.42)); // Sudden slump
        }

        // Inject Scenario 3: Heritage Ghee is extremely slow-moving across all 90 days
        if (product.id === 'prod-3') {
          // Sells only once every 12-15 days
          dailyQty = (d % 14 === 3) ? 1 : 0;
        }

        if (dailyQty > 0) {
          sales.push({
            id: `sale-${store.id}-${product.id}-${dateStr}`,
            date: dateStr,
            storeId: store.id,
            productId: product.id,
            quantity: dailyQty,
            revenue: dailyQty * product.sellingPrice,
            unitPrice: product.sellingPrice,
            createdAt: `${dateStr}T18:00:00.000Z`,
          });
        }
      });
    });
  }

  // Generate Current Inventory for each store
  // Specifically engineered for Scenarios 1, 2, 3:
  stores.forEach(store => {
    products.forEach(product => {
      let currentStock = 35; // Default safe stock level

      // Scenario 1: Imminent Stock-Out
      // Aavin Milk at Dharapuram Main (store-1): Stock = 18, 7-day avg = 8.6 => 2.09 days remaining!
      if (product.id === 'prod-1' && store.id === 'store-1') {
        currentStock = 18;
      } else if (product.id === 'prod-1' && store.id === 'store-2') {
        currentStock = 24;
      } else if (product.id === 'prod-4' && store.id === 'store-1') {
        // Coca-Cola at Dharapuram Main: Stock = 21, avg = 12 => 1.75 days remaining!
        currentStock = 21;
      } else if (product.id === 'prod-13' && store.id === 'store-1') {
        // Tata Salt: Stock = 19, avg = 4.2 => 4.5 days remaining (reorder warning)
        currentStock = 19;
      }

      // Scenario 2: Severe Overstock / Excess Inventory
      // Fortune Sunflower Oil: Stock = 185 units, avg daily sales = 2.3 => ~80 days coverage!
      else if (product.id === 'prod-14') {
        currentStock = store.id === 'store-1' ? 165 : 195;
      }
      // Surf Excel: Stock = 140 units, avg = 2.8 => 50 days coverage
      else if (product.id === 'prod-17') {
        currentStock = 135;
      }

      // Scenario 3: Slow-Moving Inventory
      // Heritage Ghee: Stock = 42 units, sold < 5 units in last 30 days!
      else if (product.id === 'prod-3') {
        currentStock = 42;
      }

      // Other products standard healthy stock
      else {
        const vel = baseVelocities[product.id] || 4.0;
        currentStock = Math.round(vel * 14) + product.safetyStock;
      }

      inventory.push({
        id: `inv-${store.id}-${product.id}`,
        date: todayStr,
        storeId: store.id,
        productId: product.id,
        quantity: currentStock,
        updatedAt: `${todayStr}T08:00:00.000Z`,
      });
    });
  });

  return { stores, products, sales, inventory };
}
