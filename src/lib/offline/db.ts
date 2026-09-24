// Browser IndexedDB wrapper for full-app offline support
// Fatima Traders Retail Management System

const DB_NAME = "fatima_retail_offline_v2";
const DB_VERSION = 3;

export interface OutboxItem {
  id: string; // client UUID (e.g. outbox_1727...)
  actionType: "SALE" | "EXPENSE" | "STOCK_ADJUSTMENT" | "PURCHASE" | "BUYER" | "SUPPLIER" | "BUYER_PAYMENT" | "SUPPLIER_PAYMENT";
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  payload: any;
  createdAt: string;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  retryCount?: number;
  error?: string;
  serverResponse?: any;
}

export interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  availableStock: number;
  categoryId?: string;
  category?: { id?: string; name: string };
  unitId?: string;
  unit?: { id?: string; abbreviation: string; name?: string };
  minStockLevel?: number;
  updatedAt?: string;
}

export interface CachedBuyer {
  id: string;
  name: string;
  contactNumber?: string | null;
  address?: string | null;
  companyName?: string | null;
  notes?: string | null;
  totalOutstanding?: number;
  isOfflineCreated?: boolean;
}

export interface CachedSupplier {
  id: string;
  name: string;
  contactNumber?: string | null;
  address?: string | null;
  companyName?: string | null;
  isOfflineCreated?: boolean;
}

export interface CachedExpense {
  id: string;
  amount: number;
  categoryId: string;
  categoryName?: string;
  branchId?: string;
  date: string;
  notes?: string | null;
  isOfflineCreated?: boolean;
  status?: string;
}

export interface CachedBranch {
  id: string;
  name: string;
  address?: string | null;
  isMain?: boolean;
}

export interface CachedCategory {
  id: string;
  name: string;
}

let dbInstance: IDBDatabase | null = null;

export function openOfflineDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is not supported in this environment"));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Products store
      if (!db.objectStoreNames.contains("products")) {
        const prodStore = db.createObjectStore("products", { keyPath: "id" });
        prodStore.createIndex("sku", "sku", { unique: false });
        prodStore.createIndex("categoryId", "categoryId", { unique: false });
        prodStore.createIndex("name", "name", { unique: false });
      }

      // Categories
      if (!db.objectStoreNames.contains("categories")) {
        db.createObjectStore("categories", { keyPath: "id" });
      }

      // Branches
      if (!db.objectStoreNames.contains("branches")) {
        db.createObjectStore("branches", { keyPath: "id" });
      }

      // Buyers
      if (!db.objectStoreNames.contains("buyers")) {
        const buyerStore = db.createObjectStore("buyers", { keyPath: "id" });
        buyerStore.createIndex("name", "name", { unique: false });
        buyerStore.createIndex("contactNumber", "contactNumber", { unique: false });
      }

      // Suppliers
      if (!db.objectStoreNames.contains("suppliers")) {
        const suppStore = db.createObjectStore("suppliers", { keyPath: "id" });
        suppStore.createIndex("name", "name", { unique: false });
      }

      // Expenses
      if (!db.objectStoreNames.contains("expenses")) {
        const expStore = db.createObjectStore("expenses", { keyPath: "id" });
        expStore.createIndex("date", "date", { unique: false });
      }

      // Expense Categories
      if (!db.objectStoreNames.contains("expense_categories")) {
        db.createObjectStore("expense_categories", { keyPath: "id" });
      }

      // Sales (cached for history and receipt preview)
      if (!db.objectStoreNames.contains("sales")) {
        const salesStore = db.createObjectStore("sales", { keyPath: "id" });
        salesStore.createIndex("invoiceNumber", "invoiceNumber", { unique: false });
        salesStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Outbox (Queue of offline actions to sync)
      if (!db.objectStoreNames.contains("outbox")) {
        const outboxStore = db.createObjectStore("outbox", { keyPath: "id" });
        outboxStore.createIndex("status", "status", { unique: false });
        outboxStore.createIndex("createdAt", "createdAt", { unique: false });
        outboxStore.createIndex("actionType", "actionType", { unique: false });
      }

      // Metadata / Key-Value
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }

      // Buyer Payments (Customer settlements)
      if (!db.objectStoreNames.contains("buyer_payments")) {
        const bpStore = db.createObjectStore("buyer_payments", { keyPath: "id" });
        bpStore.createIndex("buyerId", "buyerId", { unique: false });
        bpStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Supplier Payments (Supplier settlements)
      if (!db.objectStoreNames.contains("supplier_payments")) {
        const spStore = db.createObjectStore("supplier_payments", { keyPath: "id" });
        spStore.createIndex("supplierId", "supplierId", { unique: false });
        spStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Cached Ledgers per Party
      if (!db.objectStoreNames.contains("ledgers")) {
        db.createObjectStore("ledgers", { keyPath: "partyId" });
      }

      // Purchases (cached for offline viewing and invoice references)
      if (!db.objectStoreNames.contains("purchases")) {
        const purStore = db.createObjectStore("purchases", { keyPath: "id" });
        purStore.createIndex("supplierId", "supplierId", { unique: false });
        purStore.createIndex("invoiceNumber", "invoiceNumber", { unique: false });
        purStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Generic IndexedDB read/write helpers
export async function getAllFromStore<T = any>(storeName: string): Promise<T[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getFromStore<T = any>(storeName: string, id: string): Promise<T | null> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as T) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function putInStore<T = any>(storeName: string, item: T): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function putManyInStore<T = any>(storeName: string, items: T[]): Promise<void> {
  if (!items || items.length === 0) return;
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    items.forEach((item) => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Meta key-value storage
export async function getMeta<T = any>(key: string): Promise<T | null> {
  const item = await getFromStore<{ key: string; value: T }>("meta", key);
  return item ? item.value : null;
}

export async function setMeta<T = any>(key: string, value: T): Promise<void> {
  await putInStore("meta", { key, value });
}

// Outbox helpers
export async function enqueueOutbox(item: Omit<OutboxItem, "status" | "createdAt">): Promise<OutboxItem> {
  const record: OutboxItem = {
    ...item,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await putInStore("outbox", record);
  return record;
}

export async function getPendingOutbox(): Promise<OutboxItem[]> {
  const items = await getAllFromStore<OutboxItem>("outbox");
  return items
    .filter((item) => item.status === "PENDING" || item.status === "FAILED")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateOutboxItem(
  id: string,
  updates: Partial<OutboxItem>
): Promise<void> {
  const existing = await getFromStore<OutboxItem>("outbox", id);
  if (!existing) return;
  const updated = { ...existing, ...updates };
  await putInStore("outbox", updated);
}

// Optimistic stock decrement for POS
export async function decrementLocalStock(productId: string, quantity: number): Promise<number> {
  const product = await getFromStore<CachedProduct>("products", productId);
  if (!product) return 0;
  const newStock = Math.max(0, (product.availableStock || 0) - quantity);
  product.availableStock = newStock;
  await putInStore("products", product);
  return newStock;
}

// Optimistic stock increment for Purchases / Returns
export async function incrementLocalStock(productId: string, quantity: number): Promise<number> {
  const product = await getFromStore<CachedProduct>("products", productId);
  if (!product) return 0;
  const newStock = (product.availableStock || 0) + quantity;
  product.availableStock = newStock;
  await putInStore("products", product);
  return newStock;
}
