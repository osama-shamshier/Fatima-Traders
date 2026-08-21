"use client";

import { useEffect, useState, useCallback } from "react";
import { offlineDb, OfflineOutboxSale, CachedProduct, CachedBuyer } from "./offlineDb";
import { ProcessSalePayload } from "./saleService";

/**
 * Generates an offline provisional invoice number
 */
export function generateOfflineInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 9000 + 1000).toString();
  return `OFF-${year}${month}-${random}`;
}

/**
 * Generates a durable client UUID
 */
export function generateOfflineUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `off-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Checks true server connectivity with a fast lightweight ping
 */
export async function checkServerHealth(): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("/api/settings", {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Downloads and caches products, buyers, branches, and active session
 */
export async function cacheCatalogAndSession(branchId?: string): Promise<{
  productCount: number;
  buyerCount: number;
}> {
  if (!offlineDb) return { productCount: 0, buyerCount: 0 };

  try {
    const isOnline = await checkServerHealth();
    if (!isOnline) return { productCount: 0, buyerCount: 0 };

    const branchParam = branchId ? `?branchId=${branchId}` : "";
    const [productsRes, buyersRes, branchesRes, sessionsRes] = await Promise.all([
      fetch(`/api/pos/products${branchParam}`),
      fetch("/api/buyers"),
      fetch("/api/branches"),
      fetch("/api/counters/sessions?status=OPEN"),
    ]);

    let productCount = 0;
    let buyerCount = 0;

    if (productsRes.ok) {
      const products = await productsRes.json();
      if (Array.isArray(products)) {
        await offlineDb.products.clear();
        await offlineDb.products.bulkPut(
          products.map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            sellingPrice: Number(p.sellingPrice || 0),
            unit: p.unit,
            categoryId: p.categoryId,
            category: p.category,
            stock: Number(p.inventory?.[0]?.quantity ?? p.stock ?? 0),
            branchId: branchId || p.branchId || "",
            updatedAt: new Date().toISOString(),
          }))
        );
        productCount = products.length;
      }
    }

    if (buyersRes.ok) {
      const buyers = await buyersRes.json();
      if (Array.isArray(buyers)) {
        await offlineDb.buyers.clear();
        await offlineDb.buyers.bulkPut(
          buyers.map((b: any) => ({
            id: b.id,
            name: b.name,
            companyName: b.companyName,
            contactNumber: b.contactNumber,
            address: b.address,
            totalOutstanding: Number(b.totalOutstanding || 0),
            updatedAt: new Date().toISOString(),
          }))
        );
        buyerCount = buyers.length;
      }
    }

    if (branchesRes.ok) {
      const branches = await branchesRes.json();
      if (Array.isArray(branches)) {
        await offlineDb.branches.clear();
        await offlineDb.branches.bulkPut(
          branches.map((b: any) => ({
            id: b.id,
            name: b.name,
            address: b.address,
          }))
        );
      }
    }

    if (sessionsRes.ok) {
      const sessions = await sessionsRes.json();
      if (Array.isArray(sessions) && sessions.length > 0) {
        await offlineDb.sessions.clear();
        await offlineDb.sessions.bulkPut(
          sessions.map((s: any) => ({
            id: s.id,
            cashCounterId: s.cashCounterId,
            branchId: s.branchId,
            status: s.status,
            counterName: s.cashCounter?.name,
            cashierName: s.user?.name,
            updatedAt: new Date().toISOString(),
          }))
        );
      }
    }

    return { productCount, buyerCount };
  } catch (err) {
    console.warn("Failed to cache catalog for offline use:", err);
    return { productCount: 0, buyerCount: 0 };
  }
}

/**
 * Saves a sale locally in the IndexedDB Outbox and decrements local cache
 */
export async function saveOfflineSale(salePayload: ProcessSalePayload): Promise<{
  outboxSale: OfflineOutboxSale;
  receiptSaleData: any;
}> {
  if (!offlineDb) throw new Error("IndexedDB is not supported on this browser.");

  const offlineId = salePayload.offlineId || generateOfflineUUID();
  const offlineInvoiceNumber = salePayload.offlineInvoiceNumber || generateOfflineInvoiceNumber();
  const offlineCreatedAt = new Date().toISOString();

  const preparedPayload: ProcessSalePayload = {
    ...salePayload,
    offlineId,
    offlineInvoiceNumber,
    offlineCreatedAt,
  };

  const outboxSale: OfflineOutboxSale = {
    id: offlineId,
    offlineInvoiceNumber,
    offlineCreatedAt,
    payload: preparedPayload,
    status: "PENDING",
    retryCount: 0,
    updatedAt: offlineCreatedAt,
  };

  // 1. Save in Outbox
  await offlineDb.outboxSales.put(outboxSale);

  // 2. Decrement local product stock in cache
  for (const item of preparedPayload.items) {
    const cached = await offlineDb.products.get(item.productId);
    if (cached) {
      await offlineDb.products.update(item.productId, {
        stock: cached.stock - Number(item.quantity),
      });
    }
  }

  // 3. Update local cached buyer debt if applicable
  if (preparedPayload.buyerId) {
    const buyer = await offlineDb.buyers.get(preparedPayload.buyerId);
    if (buyer) {
      const grandTotal = Math.max(
        0,
        preparedPayload.items.reduce(
          (sum, i) => sum + Number(i.quantity) * Number(i.sellingPrice) - Number(i.discount || 0),
          0
        ) -
          Number(preparedPayload.discount || 0) +
          Number(preparedPayload.roundOff || 0)
      );
      const amountPaid = Number(preparedPayload.amountPaid || 0);
      const remainingDebt = grandTotal - amountPaid;
      if (remainingDebt > 0) {
        await offlineDb.buyers.update(preparedPayload.buyerId, {
          totalOutstanding: buyer.totalOutstanding + remainingDebt,
        });
      }
    }
  }

  // 4. Format a mock sale object for instant thermal receipt rendering
  const subtotal = preparedPayload.items.reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.sellingPrice) - Number(i.discount || 0),
    0
  );
  const grandTotal = Math.max(
    0,
    subtotal - Number(preparedPayload.discount || 0) + Number(preparedPayload.roundOff || 0)
  );
  const amountPaidNum = Math.min(grandTotal, Number(preparedPayload.amountPaid || 0));

  const cachedBuyer = preparedPayload.buyerId
    ? await offlineDb.buyers.get(preparedPayload.buyerId)
    : null;
  const cachedBranch = await offlineDb.branches.get(preparedPayload.branchId);

  const receiptSaleData = {
    id: offlineId,
    invoiceNumber: offlineInvoiceNumber,
    isOffline: true,
    saleDate: offlineCreatedAt,
    subtotal,
    discount: preparedPayload.discount || 0,
    roundOff: preparedPayload.roundOff || 0,
    grandTotal,
    amountPaid: amountPaidNum,
    outstandingAmount: grandTotal - amountPaidNum,
    paymentStatus: amountPaidNum >= grandTotal ? "PAID" : amountPaidNum > 0 ? "PARTIAL" : "PENDING",
    paymentMethod: preparedPayload.paymentMethod || "CASH",
    buyer: cachedBuyer ? { id: cachedBuyer.id, name: cachedBuyer.name } : null,
    branch: cachedBranch ? { id: cachedBranch.id, name: cachedBranch.name } : { name: "Main Branch" },
    items: preparedPayload.items.map((i) => ({
      id: `${offlineId}-${i.productId}`,
      productId: i.productId,
      quantity: i.quantity,
      sellingPrice: i.sellingPrice,
      discount: i.discount || 0,
      lineTotal: Number(i.quantity) * Number(i.sellingPrice) - Number(i.discount || 0),
    })),
  };

  return { outboxSale, receiptSaleData };
}

/**
 * Synchronizes pending outbox sales to the server in batch
 */
export async function syncOutboxSales(): Promise<{
  successCount: number;
  failedCount: number;
}> {
  if (!offlineDb) return { successCount: 0, failedCount: 0 };

  const isOnline = await checkServerHealth();
  if (!isOnline) return { successCount: 0, failedCount: 0 };

  const pendingSales = await offlineDb.outboxSales
    .where("status")
    .equals("PENDING")
    .or("status")
    .equals("FAILED")
    .toArray();

  if (pendingSales.length === 0) return { successCount: 0, failedCount: 0 };

  // Mark all as SYNCING
  await offlineDb.outboxSales
    .where("id")
    .anyOf(pendingSales.map((s: OfflineOutboxSale) => s.id))
    .modify({ status: "SYNCING", updatedAt: new Date().toISOString() });

  try {
    const response = await fetch("/api/pos/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sales: pendingSales.map((s: OfflineOutboxSale) => s.payload) }),
    });

    if (!response.ok) {
      throw new Error(`Sync API responded with status ${response.status}`);
    }

    const data = await response.json();
    const results: any[] = data.results || [];

    let successCount = 0;
    let failedCount = 0;

    for (const res of results) {
      const existing = pendingSales.find((s: OfflineOutboxSale) => s.id === res.offlineId);
      if (!existing) continue;

      if (res.status === "SUCCESS" || res.status === "DUPLICATE") {
        successCount++;
        await offlineDb.outboxSales.update(existing.id, {
          status: "SYNCED",
          serverInvoiceNumber: res.serverInvoiceNumber,
          error: null,
          updatedAt: new Date().toISOString(),
        });
      } else {
        failedCount++;
        await offlineDb.outboxSales.update(existing.id, {
          status: "FAILED",
          error: res.error || "Server failed to process sale",
          retryCount: (existing.retryCount || 0) + 1,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Refresh catalog after sync
    await cacheCatalogAndSession();

    return { successCount, failedCount };
  } catch (err: any) {
    console.error("Batch sync request error:", err);
    // Reset SYNCING back to PENDING or FAILED
    await offlineDb.outboxSales
      .where("id")
      .anyOf(pendingSales.map((s: OfflineOutboxSale) => s.id))
      .modify({
        status: "FAILED",
        error: err.message || "Network sync failed",
        updatedAt: new Date().toISOString(),
      });

    return { successCount: 0, failedCount: pendingSales.length };
  }
}

/**
 * React Hook for real-time offline status and sync operations
 */
export function useOfflineSync(branchId?: string) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [outboxItems, setOutboxItems] = useState<OfflineOutboxSale[]>([]);

  const refreshCounts = useCallback(async () => {
    if (!offlineDb) return;
    try {
      const all = await offlineDb.outboxSales.toArray();
      setOutboxItems(all);
      const pending = all.filter((s: OfflineOutboxSale) => s.status === "PENDING" || s.status === "SYNCING").length;
      const failed = all.filter((s: OfflineOutboxSale) => s.status === "FAILED").length;
      setPendingCount(pending);
      setFailedCount(failed);
    } catch (e) {
      console.warn("Failed to read outbox counts:", e);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncOutboxSales();
      await refreshCounts();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshCounts]);

  useEffect(() => {
    const updateOnlineStatus = async () => {
      const healthy = await checkServerHealth();
      setIsOnline(healthy);
      if (healthy) {
        triggerSync();
      }
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", () => setIsOnline(false));

    // Initial check & catalog cache
    updateOnlineStatus();
    cacheCatalogAndSession(branchId).then(() => refreshCounts());

    // Health check polling every 25 seconds
    const interval = setInterval(() => {
      updateOnlineStatus();
      refreshCounts();
    }, 25000);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", () => setIsOnline(false));
      clearInterval(interval);
    };
  }, [branchId, triggerSync, refreshCounts]);

  const clearSyncedSales = async () => {
    if (!offlineDb) return;
    await offlineDb.outboxSales.where("status").equals("SYNCED").delete();
    await refreshCounts();
  };

  return {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    outboxItems,
    triggerSync,
    clearSyncedSales,
    refreshCounts,
    cacheCatalog: () => cacheCatalogAndSession(branchId),
  };
}
