// High-level cache and offline transaction service
// Fatima Traders Retail Management System

import {
  openOfflineDB,
  getAllFromStore,
  getFromStore,
  putInStore,
  putManyInStore,
  enqueueOutbox,
  decrementLocalStock,
  incrementLocalStock,
  setMeta,
  getMeta,
  CachedProduct,
  CachedBuyer,
  CachedExpense,
  CachedBranch,
  CachedCategory,
  OutboxItem,
} from "./db";

// Generate offline invoice number: OFF-YYYYMMDD-XXXX
export function generateOfflineInvoiceNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `OFF-${yyyy}${mm}${dd}-${rand}`;
}

// Generate client UUID
export function generateClientUUID(prefix: string = "offline"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Cache live server data into IndexedDB
export async function cacheCatalogData(data: {
  products?: CachedProduct[];
  categories?: CachedCategory[];
  branches?: CachedBranch[];
  buyers?: CachedBuyer[];
  expenses?: CachedExpense[];
}): Promise<void> {
  try {
    await openOfflineDB();

    if (data.products && data.products.length > 0) {
      await putManyInStore("products", data.products);
    }
    if (data.categories && data.categories.length > 0) {
      await putManyInStore("categories", data.categories);
    }
    if (data.branches && data.branches.length > 0) {
      await putManyInStore("branches", data.branches);
    }
    if (data.buyers && data.buyers.length > 0) {
      await putManyInStore("buyers", data.buyers);
    }
    if (data.expenses && data.expenses.length > 0) {
      await putManyInStore("expenses", data.expenses);
    }

    await setMeta("lastCachedAt", new Date().toISOString());
  } catch (error) {
    console.warn("Failed to cache catalog data offline:", error);
  }
}

// Calculate total quantities of products sold in pending offline sales
export async function getPendingOfflineDeductions(): Promise<Record<string, number>> {
  try {
    const outbox = await getAllFromStore<OutboxItem>("outbox");
    const deductions: Record<string, number> = {};
    for (const item of outbox) {
      if ((item.status === "PENDING" || item.status === "FAILED") && item.actionType === "SALE" && item.payload?.items) {
        for (const saleItem of item.payload.items) {
          const pid = saleItem.productId;
          deductions[pid] = (deductions[pid] || 0) + Number(saleItem.quantity || 0);
        }
      }
    }
    return deductions;
  } catch (err) {
    console.error("Error calculating pending offline deductions:", err);
    return {};
  }
}

// Calculate total offline credit (outstanding balance) accumulated per buyer
export async function getPendingOfflineBuyerCredits(): Promise<Record<string, number>> {
  try {
    const outbox = await getAllFromStore<OutboxItem>("outbox");
    const credits: Record<string, number> = {};
    for (const item of outbox) {
      if ((item.status === "PENDING" || item.status === "FAILED") && item.actionType === "SALE" && item.payload?.buyerId) {
        const buyerId = item.payload.buyerId;
        const grandTotal = Number(item.payload.grandTotal || 0);
        const amountPaid = Number(item.payload.amountPaid || 0);
        const outstanding = Math.max(0, grandTotal - amountPaid);
        if (outstanding > 0) {
          credits[buyerId] = (credits[buyerId] || 0) + outstanding;
        }
      }
    }
    return credits;
  } catch (err) {
    console.error("Error calculating pending offline buyer credits:", err);
    return {};
  }
}

// Apply offline deductions to any product list
export async function applyOfflineDeductionsToProducts<T extends { id: string; availableStock?: number; stock?: number }>(
  products: T[]
): Promise<T[]> {
  const deductions = await getPendingOfflineDeductions();
  return products.map((p) => {
    const deduct = deductions[p.id] || 0;
    const baseStock = Number(p.availableStock !== undefined ? p.availableStock : p.stock !== undefined ? p.stock : 0);
    const effectiveStock = Math.max(0, baseStock - deduct);
    return {
      ...p,
      availableStock: effectiveStock,
      stock: effectiveStock,
    } as unknown as T;
  });
}

// Apply offline credits to any buyer list
export async function applyOfflineCreditsToBuyers<T extends { id: string; totalOutstanding?: number }>(
  buyers: T[]
): Promise<T[]> {
  const credits = await getPendingOfflineBuyerCredits();
  return buyers.map((b) => {
    const addDebt = credits[b.id] || 0;
    return {
      ...b,
      totalOutstanding: Number(b.totalOutstanding || 0) + addDebt,
    } as unknown as T;
  });
}

// Retrieve offline products with filtering and active deductions applied
export async function getOfflineProducts(filters?: {
  categoryId?: string;
  search?: string;
}): Promise<CachedProduct[]> {
  try {
    const rawProducts = await getAllFromStore<CachedProduct>("products");
    const products = await applyOfflineDeductionsToProducts(rawProducts);
    let result = products;

    if (filters?.categoryId) {
      result = result.filter(
        (p) => p.categoryId === filters.categoryId || p.category?.id === filters.categoryId
      );
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      );
    }

    return result;
  } catch (error) {
    console.error("Error getting offline products:", error);
    return [];
  }
}

// Retrieve offline buyers with active credits applied
export async function getOfflineBuyers(): Promise<CachedBuyer[]> {
  try {
    const rawBuyers = await getAllFromStore<CachedBuyer>("buyers");
    return applyOfflineCreditsToBuyers(rawBuyers);
  } catch (error) {
    console.error("Error getting offline buyers:", error);
    return [];
  }
}

// Record an offline POS sale
export async function recordOfflineSale(payload: {
  buyerId?: string;
  branchId: string;
  discount: number;
  roundOff: number;
  items: Array<{
    productId: string;
    quantity: number;
    sellingPrice: number;
    discount: number;
    name?: string;
    sku?: string;
  }>;
  amountPaid: number;
  paymentMethod: string;
  bankName?: string;
  bankReference?: string;
  dueDate?: string;
  notes?: string;
}): Promise<any> {
  const clientSaleId = generateClientUUID("sale");
  const invoiceNumber = generateOfflineInvoiceNumber();
  const now = new Date().toISOString();

  // Optimistically decrement local stock for each product in IndexedDB
  for (const item of payload.items) {
    await decrementLocalStock(item.productId, item.quantity);
  }

  // Calculate totals
  let subtotal = 0;
  const saleItems = payload.items.map((i) => {
    const lineTotal = i.quantity * i.sellingPrice - (i.discount || 0);
    subtotal += lineTotal;
    return {
      productId: i.productId,
      quantity: i.quantity,
      sellingPrice: i.sellingPrice,
      discount: i.discount || 0,
      lineTotal,
      product: {
        id: i.productId,
        name: i.name || "Product",
        sku: i.sku || "N/A",
      },
    };
  });

  const grandTotal = Math.max(0, subtotal - (payload.discount || 0) + (payload.roundOff || 0));
  const amountPaidNum = Math.min(grandTotal, Math.max(0, Number(payload.amountPaid || 0)));
  const outstandingAmount = Math.max(0, grandTotal - amountPaidNum);
  const paymentStatus =
    amountPaidNum >= grandTotal ? "PAID" : amountPaidNum > 0 ? "PARTIAL" : "PENDING";

  // If credit sale to a buyer, immediately update buyer's totalOutstanding in IndexedDB
  if (payload.buyerId && outstandingAmount > 0) {
    const buyer = await getFromStore<CachedBuyer>("buyers", payload.buyerId);
    if (buyer) {
      buyer.totalOutstanding = Number(buyer.totalOutstanding || 0) + outstandingAmount;
      await putInStore("buyers", buyer);
    }
  }

  // Create simulated sale object matching Prisma Sale structure for ReceiptModal
  const completedSale = {
    id: clientSaleId,
    clientSaleId,
    invoiceNumber,
    isOffline: true,
    branchId: payload.branchId,
    buyerId: payload.buyerId || null,
    saleDate: now,
    createdAt: now,
    dueDate: payload.dueDate || null,
    subtotal,
    discount: payload.discount || 0,
    roundOff: payload.roundOff || 0,
    grandTotal,
    amountPaid: amountPaidNum,
    outstandingAmount,
    paymentStatus,
    paymentMethod: payload.paymentMethod || "CASH",
    notes: payload.notes || "Offline Transaction",
    items: saleItems,
  };

  // Cache sale record locally for receipt re-printing
  await putInStore("sales", completedSale);

  // Enqueue to Outbox for server sync
  await enqueueOutbox({
    id: clientSaleId,
    actionType: "SALE",
    endpoint: "/api/sales/sync",
    method: "POST",
    payload: {
      ...payload,
      clientSaleId,
      offlineInvoiceNumber: invoiceNumber,
      offlineCreatedAt: now,
    },
  });

  return completedSale;
}

// Record an offline Expense
export async function recordOfflineExpense(payload: {
  amount: number;
  categoryId: string;
  categoryName?: string;
  branchId?: string;
  date?: string;
  notes?: string;
}): Promise<any> {
  const clientExpenseId = generateClientUUID("exp");
  const now = new Date().toISOString();

  const expenseRecord: CachedExpense = {
    id: clientExpenseId,
    amount: Number(payload.amount),
    categoryId: payload.categoryId,
    categoryName: payload.categoryName || "General",
    branchId: payload.branchId,
    date: payload.date || now.split("T")[0],
    notes: payload.notes || null,
    isOfflineCreated: true,
    status: "PENDING_SYNC",
  };

  await putInStore("expenses", expenseRecord);

  await enqueueOutbox({
    id: clientExpenseId,
    actionType: "EXPENSE",
    endpoint: "/api/expenses",
    method: "POST",
    payload: {
      ...payload,
      clientExpenseId,
      isOffline: true,
    },
  });

  return expenseRecord;
}

// Record an offline Buyer
export async function recordOfflineBuyer(payload: {
  name: string;
  contactNumber?: string;
  address?: string;
  companyName?: string;
}): Promise<CachedBuyer> {
  const clientBuyerId = generateClientUUID("buyer");

  const buyerRecord: CachedBuyer = {
    id: clientBuyerId,
    name: payload.name,
    contactNumber: payload.contactNumber || null,
    address: payload.address || null,
    companyName: payload.companyName || null,
    isOfflineCreated: true,
  };

  await putInStore("buyers", buyerRecord);

  await enqueueOutbox({
    id: clientBuyerId,
    actionType: "BUYER",
    endpoint: "/api/buyers",
    method: "POST",
    payload: {
      ...payload,
      clientBuyerId,
      isOffline: true,
    },
  });

  return buyerRecord;
}

// Get combined sales list (Cached + Pending Offline) for Sales History Page
export async function getCombinedSales(liveSales: any[] = []): Promise<any[]> {
  try {
    const cachedSales = await getAllFromStore<any>("sales");
    const outbox = await getAllFromStore<OutboxItem>("outbox");

    const pendingSaleIds = new Set(
      outbox.filter((o) => o.status === "PENDING" || o.status === "FAILED").map((o) => o.id)
    );

    // Identify pending offline sales
    const pendingSales = cachedSales
      .filter((s) => pendingSaleIds.has(s.id) || pendingSaleIds.has(s.clientSaleId))
      .map((s) => ({
        ...s,
        isOfflinePending: true,
      }));

    // Merge: Put pending offline sales at the top
    const liveIds = new Set(liveSales.map((ls) => ls.id));
    const unSyncedPending = pendingSales.filter((ps) => !liveIds.has(ps.id));

    return [...unSyncedPending, ...liveSales];
  } catch (err) {
    console.error("Error combining sales:", err);
    return liveSales;
  }
}
