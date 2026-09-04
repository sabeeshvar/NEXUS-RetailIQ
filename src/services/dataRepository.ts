import { Store, Product, Sale, InventoryRecord, Alert } from '../types';
import { generateRetailDemoData } from '../data/demoData';
import { db, isConfigured } from './firebase';
import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from 'firebase/firestore';

const STORAGE_KEYS = {
  STORES: 'nexus_retailiq_stores',
  PRODUCTS: 'nexus_retailiq_products',
  SALES: 'nexus_retailiq_sales',
  INVENTORY: 'nexus_retailiq_inventory',
  ALERTS: 'nexus_retailiq_alerts',
  DEMO_LOADED: 'nexus_retailiq_demo_loaded',
};

// Event emitter for reactive updates in React hooks
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyChange() {
  listeners.forEach(cb => cb());
}

export class DataRepository {
  public static subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  public static hasData(): boolean {
    const rawProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return Boolean(rawProducts && JSON.parse(rawProducts).length > 0);
  }

  public static getStores(): Store[] {
    const raw = localStorage.getItem(STORAGE_KEYS.STORES);
    return raw ? JSON.parse(raw) : [];
  }

  public static getProducts(): Product[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return raw ? JSON.parse(raw) : [];
  }

  public static getSales(storeId?: string): Sale[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SALES);
    const allSales: Sale[] = raw ? JSON.parse(raw) : [];
    if (storeId && storeId !== 'all') {
      return allSales.filter(s => s.storeId === storeId);
    }
    return allSales;
  }

  public static getInventory(storeId?: string): InventoryRecord[] {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    const allInv: InventoryRecord[] = raw ? JSON.parse(raw) : [];
    if (storeId && storeId !== 'all') {
      return allInv.filter(i => i.storeId === storeId);
    }
    return allInv;
  }

  /**
   * Fetch live collections from Cloud Firestore and synchronize cache
   */
  public static async fetchFromFirestore(): Promise<boolean> {
    if (!isConfigured || !db) return false;
    try {
      console.log('[NEXUS RetailIQ] Querying live Cloud Firestore collections...');
      const storesSnap = await getDocs(collection(db, 'stores'));
      const productsSnap = await getDocs(collection(db, 'products'));
      const inventorySnap = await getDocs(collection(db, 'inventory'));
      const salesSnap = await getDocs(collection(db, 'sales'));

      if (!storesSnap.empty && !productsSnap.empty) {
        const stores = storesSnap.docs.map(d => d.data() as Store);
        const products = productsSnap.docs.map(d => d.data() as Product);
        const inventory = inventorySnap.docs.map(d => d.data() as InventoryRecord);
        const sales = salesSnap.docs.map(d => d.data() as Sale);

        localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
        if (sales.length > 0) {
          localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
        }
        notifyChange();
        console.log('[NEXUS RetailIQ] Live Cloud Firestore sync complete.');
        return true;
      }
    } catch (err) {
      console.warn('[NEXUS RetailIQ] Firestore read warning (falling back to cache):', err);
    }
    return false;
  }

  /**
   * Load Demo Data immediately into localStorage and Firestore (if connected)
   */
  public static async loadDemoData(): Promise<void> {
    const demo = generateRetailDemoData();

    // 1. Store in local repository for instant client response
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(demo.stores));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(demo.products));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(demo.sales));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(demo.inventory));
    localStorage.setItem(STORAGE_KEYS.DEMO_LOADED, 'true');

    // 2. If Cloud Firestore is configured, write batch data
    if (isConfigured && db) {
      try {
        console.log('[NEXUS RetailIQ] Syncing demo dataset to Cloud Firestore...');
        const batch = writeBatch(db);

        // Upload stores
        demo.stores.forEach(s => {
          batch.set(doc(db!, 'stores', s.id), s);
        });

        // Upload products (first 30)
        demo.products.forEach(p => {
          batch.set(doc(db!, 'products', p.id), p);
        });

        // Upload current inventory
        demo.inventory.forEach(inv => {
          batch.set(doc(db!, 'inventory', inv.id), inv);
        });

        // Upload recent 7 days of sales to Firestore to prevent quota limits
        const recentSales = demo.sales.slice(-200);
        recentSales.forEach(sale => {
          batch.set(doc(db!, 'sales', sale.id), sale);
        });

        await batch.commit();
        console.log('[NEXUS RetailIQ] Cloud Firestore sync complete.');
      } catch (err) {
        console.error('[NEXUS RetailIQ] Failed to write to Cloud Firestore:', err);
      }
    }

    notifyChange();
  }

  /**
   * Clear all loaded retail data
   */
  public static clearData(): void {
    localStorage.removeItem(STORAGE_KEYS.STORES);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    localStorage.removeItem(STORAGE_KEYS.ALERTS);
    localStorage.removeItem(STORAGE_KEYS.DEMO_LOADED);
    notifyChange();
  }

  /**
   * Import custom products, sales, stores, or inventory
   */
  public static importProducts(products: Product[]): void {
    const existing = this.getProducts();
    const existingMap = new Map(existing.map(p => [p.id, p]));
    products.forEach(p => existingMap.set(p.id, p));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(Array.from(existingMap.values())));
    notifyChange();
  }

  public static importSales(sales: Sale[]): void {
    const existing = this.getSales();
    const merged = [...existing, ...sales];
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(merged));
    notifyChange();
  }

  public static importInventory(inventory: InventoryRecord[]): void {
    const existing = this.getInventory();
    const existingMap = new Map(existing.map(i => [`${i.storeId}-${i.productId}`, i]));
    inventory.forEach(i => existingMap.set(`${i.storeId}-${i.productId}`, i));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(Array.from(existingMap.values())));
    notifyChange();
  }

  public static importStores(stores: Store[]): void {
    const existing = this.getStores();
    const existingMap = new Map(existing.map(s => [s.id, s]));
    stores.forEach(s => existingMap.set(s.id, s));
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(Array.from(existingMap.values())));
    notifyChange();
  }
}
