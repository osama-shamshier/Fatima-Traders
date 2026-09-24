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
  CachedSupplier,
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
  suppliers?: CachedSupplier[];
  purchases?: any[];
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
    if (data.suppliers && data.suppliers.length > 0) {
      await putManyInStore("suppliers", data.suppliers);
    }
    if (data.purchases && data.purchases.length > 0) {
      await putManyInStore("purchases", data.purchases);
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

// Calculate total offline disbursements made per supplier
export async function getPendingOfflineSupplierDisbursements(): Promise<Record<string, number>> {
  try {
    const outbox = await getAllFromStore<OutboxItem>("outbox");
    const disbursements: Record<string, number> = {};
    for (const item of outbox) {
      if ((item.status === "PENDING" || item.status === "FAILED") && item.actionType === "SUPPLIER_PAYMENT" && item.payload?.supplierId) {
        const suppId = item.payload.supplierId;
        const amount = Number(item.payload.amount || 0);
        if (amount > 0) {
          disbursements[suppId] = (disbursements[suppId] || 0) + amount;
        }
      }
    }
    return disbursements;
  } catch (err) {
    console.error("Error calculating pending offline supplier disbursements:", err);
    return {};
  }
}

// Apply offline disbursements to any supplier list (reducing their outstanding payable balance in real-time)
export async function applyOfflineDisbursementsToSuppliers<T extends { id: string; totalOutstanding?: number; outstandingBalance?: number }>(
  suppliers: T[]
): Promise<T[]> {
  const disbursements = await getPendingOfflineSupplierDisbursements();
  return suppliers.map((s) => {
    const deduct = disbursements[s.id] || 0;
    const currentOutstanding = Number(s.totalOutstanding !== undefined ? s.totalOutstanding : s.outstandingBalance || 0);
    const newOutstanding = Math.max(0, currentOutstanding - deduct);
    return {
      ...s,
      totalOutstanding: newOutstanding,
      outstandingBalance: newOutstanding,
    } as unknown as T;
  });
}

// Retrieve offline suppliers with active disbursement adjustments applied
export async function getOfflineSuppliers(search?: string): Promise<CachedSupplier[]> {
  try {
    const rawSuppliers = await getAllFromStore<CachedSupplier>("suppliers");
    const suppliers = await applyOfflineDisbursementsToSuppliers(rawSuppliers);
    if (!search) return suppliers;
    const q = search.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.companyName && s.companyName.toLowerCase().includes(q)) ||
        (s.contactNumber && s.contactNumber.includes(q))
    );
  } catch (err) {
    console.error("Error retrieving offline suppliers:", err);
    return [];
  }
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

// Record an offline Supplier
export async function recordOfflineSupplier(payload: {
  name: string;
  contactNumber?: string;
  address?: string;
  companyName?: string;
}): Promise<CachedSupplier> {
  const clientSupplierId = generateClientUUID("supp");

  const supplierRecord: CachedSupplier = {
    id: clientSupplierId,
    name: payload.name,
    contactNumber: payload.contactNumber || null,
    address: payload.address || null,
    companyName: payload.companyName || null,
    isOfflineCreated: true,
  };

  await putInStore("suppliers", supplierRecord);

  await enqueueOutbox({
    id: clientSupplierId,
    actionType: "SUPPLIER",
    endpoint: "/api/suppliers",
    method: "POST",
    payload: {
      ...payload,
      clientSupplierId,
      isOffline: true,
    },
  });

  return supplierRecord;
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

// Record an offline Buyer Settlement Payment
export async function recordOfflineBuyerPayment(payload: {
  buyerId: string;
  amount: number;
  paymentMethod: string;
  bankName?: string;
  bankReference?: string;
  notes?: string;
  paymentDate?: string;
}): Promise<any> {
  const clientPaymentId = generateClientUUID("pay");
  const now = new Date().toISOString();
  const paymentAmount = Number(payload.amount);

  // 1. Immediately reduce buyer's totalOutstanding in local storage
  const buyer = await getFromStore<CachedBuyer>("buyers", payload.buyerId);
  if (buyer) {
    buyer.totalOutstanding = Math.max(0, Number(buyer.totalOutstanding || 0) - paymentAmount);
    await putInStore("buyers", buyer);
  }

  // 2. Save payment record in local store
  const paymentRecord = {
    id: clientPaymentId,
    clientPaymentId,
    buyerId: payload.buyerId,
    amount: paymentAmount,
    paymentMethod: payload.paymentMethod || "CASH",
    bankReference: payload.bankReference || null,
    notes: payload.notes || "Offline Customer Settlement",
    paymentDate: payload.paymentDate || now,
    createdAt: now,
    isOffline: true,
  };
  await putInStore("buyer_payments", paymentRecord);

  // 3. Enqueue to Outbox for server sync
  await enqueueOutbox({
    id: clientPaymentId,
    actionType: "BUYER_PAYMENT",
    endpoint: "/api/buyer-payments",
    method: "POST",
    payload: {
      ...payload,
      amount: paymentAmount,
      clientPaymentId,
      isOffline: true,
    },
  });

  return paymentRecord;
}

// Record an offline Supplier Settlement Payment
export async function recordOfflineSupplierPayment(payload: {
  supplierId: string;
  purchaseId?: string;
  amount: number;
  paymentMethod: string;
  bankReference?: string;
  notes?: string;
  paymentDate?: string;
}): Promise<any> {
  const clientPaymentId = generateClientUUID("spay");
  const now = new Date().toISOString();
  const paymentAmount = Number(payload.amount);

  const paymentRecord = {
    id: clientPaymentId,
    clientPaymentId,
    supplierId: payload.supplierId,
    purchaseId: payload.purchaseId || null,
    amount: paymentAmount,
    paymentMethod: payload.paymentMethod || "CASH",
    bankReference: payload.bankReference || null,
    notes: payload.notes || "Offline Supplier Settlement",
    paymentDate: payload.paymentDate || now,
    createdAt: now,
    isOffline: true,
  };
  await putInStore("supplier_payments", paymentRecord);

  await enqueueOutbox({
    id: clientPaymentId,
    actionType: "SUPPLIER_PAYMENT",
    endpoint: "/api/supplier-payments",
    method: "POST",
    payload: {
      ...payload,
      amount: paymentAmount,
      clientPaymentId,
      isOffline: true,
    },
  });

  return paymentRecord;
}

// Cache ledger data for offline browsing
export async function cachePartyLedger(partyId: string, entries: any[]): Promise<void> {
  try {
    await putInStore("ledgers", { partyId, entries, cachedAt: new Date().toISOString() });
  } catch (e) {
    console.warn("Failed to cache ledger:", e);
  }
}

// Combine server ledger with real-time pending offline transactions (Debits & Credits)
export async function getCombinedBuyerLedger(buyerId: string, liveLedger: any[] = []): Promise<any[]> {
  try {
    // 1. If live ledger was passed, cache it
    if (liveLedger.length > 0) {
      cachePartyLedger(buyerId, liveLedger);
    }

    // 2. If offline and no live ledger, load from cache
    let baseLedger = liveLedger;
    if (baseLedger.length === 0) {
      const cached = await getFromStore<{ partyId: string; entries: any[] }>("ledgers", buyerId);
      if (cached?.entries) {
        baseLedger = cached.entries;
      }
    }

    // 3. Find pending offline sales for this buyer (Debits)
    const outbox = await getAllFromStore<OutboxItem>("outbox");
    const pendingSales = outbox.filter(
      (o) => (o.status === "PENDING" || o.status === "FAILED") && o.actionType === "SALE" && o.payload?.buyerId === buyerId
    );

    // 4. Find pending offline payments for this buyer (Credits)
    const pendingPayments = outbox.filter(
      (o) => (o.status === "PENDING" || o.status === "FAILED") && o.actionType === "BUYER_PAYMENT" && o.payload?.buyerId === buyerId
    );

    // If no pending offline items, return base
    if (pendingSales.length === 0 && pendingPayments.length === 0) {
      return baseLedger;
    }

    // Create synthetic ledger rows for pending sales
    const offlineDebitRows = pendingSales.map((item) => {
      const p = item.payload;
      return {
        id: item.id,
        date: p.offlineCreatedAt || item.createdAt,
        type: "SALE",
        reference: p.offlineInvoiceNumber || "Offline Invoice",
        description: `Offline Purchase (${p.items?.length || 0} items)`,
        debit: Number(p.grandTotal || 0),
        credit: 0,
        isOfflinePending: true,
      };
    });

    // Create synthetic ledger rows for pending payments
    const offlineCreditRows = pendingPayments.map((item) => {
      const p = item.payload;
      return {
        id: item.id,
        date: p.paymentDate || item.createdAt,
        type: "PAYMENT",
        reference: `VOUCHER-${item.id.slice(-6).toUpperCase()}`,
        description: p.notes || "Offline Cash Settlement",
        debit: 0,
        credit: Number(p.amount || 0),
        isOfflinePending: true,
      };
    });

    // Combine all entries and sort chronologically
    const allEntries = [...baseLedger, ...offlineDebitRows, ...offlineCreditRows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Recompute accurate running balance
    let runningBalance = 0;
    return allEntries.map((row) => {
      runningBalance = runningBalance + Number(row.debit || 0) - Number(row.credit || 0);
      return {
        ...row,
        balance: runningBalance,
      };
    });
  } catch (err) {
    console.error("Error creating combined ledger:", err);
    return liveLedger;
  }
}

// Combine server supplier ledger with real-time pending offline disbursements (Credits)
export async function getCombinedSupplierLedger(supplierId: string, liveLedger: any[] = []): Promise<any[]> {
  try {
    // 1. If live ledger was passed, cache it
    if (liveLedger.length > 0) {
      await cachePartyLedger(`supplier_${supplierId}`, liveLedger);
    }

    // 2. If offline and no live ledger, load from cache
    let baseLedger = liveLedger;
    if (baseLedger.length === 0) {
      const cached = await getFromStore<{ partyId: string; entries: any[] }>("ledgers", `supplier_${supplierId}`);
      if (cached?.entries) {
        baseLedger = cached.entries;
      }
    }

    // 3. Find pending offline payments for this supplier (Credits: reducing payable balance)
    const outbox = await getAllFromStore<OutboxItem>("outbox");
    const pendingPayments = outbox.filter(
      (o) => (o.status === "PENDING" || o.status === "FAILED") && o.actionType === "SUPPLIER_PAYMENT" && o.payload?.supplierId === supplierId
    );

    if (pendingPayments.length === 0) {
      return baseLedger;
    }

    // Create synthetic ledger rows for pending payments
    const offlineCreditRows = pendingPayments.map((item) => {
      const p = item.payload;
      return {
        id: item.id,
        date: p.paymentDate || item.createdAt,
        type: "PAYMENT",
        reference: p.bankReference || `VOUCHER-${item.id.slice(-6).toUpperCase()}`,
        description: p.notes || "Offline Cash Disbursement",
        debit: 0,
        credit: Number(p.amount || 0),
        isOfflinePending: true,
      };
    });

    // Combine all entries and sort chronologically
    const allEntries = [...baseLedger, ...offlineCreditRows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Recompute accurate running balance: running += debit - credit
    let runningBalance = 0;
    return allEntries.map((row) => {
      runningBalance = runningBalance + Number(row.debit || 0) - Number(row.credit || 0);
      return {
        ...row,
        calculatedBalance: runningBalance,
      };
    });
  } catch (err) {
    console.error("Error creating combined supplier ledger:", err);
    return liveLedger;
  }
}

// Combine server supplier payments with pending offline supplier payments
export async function getCombinedSupplierPayments(livePayments: any[] = []): Promise<any[]> {
  try {
    const outbox = await getAllFromStore<OutboxItem>("outbox");
    const pendingSupplierPayments = outbox.filter(
      (o) => (o.status === "PENDING" || o.status === "FAILED") && o.actionType === "SUPPLIER_PAYMENT"
    );

    const suppliers = await getAllFromStore<CachedSupplier>("suppliers");
    const supplierMap = new Map<string, CachedSupplier>();
    suppliers.forEach((s) => supplierMap.set(s.id, s));

    const pendingPaymentRecords = pendingSupplierPayments.map((item) => {
      const p = item.payload;
      const supp = supplierMap.get(p.supplierId);
      return {
        id: item.id,
        supplierId: p.supplierId,
        supplier: supp ? { id: supp.id, name: supp.name, companyName: supp.companyName } : { id: p.supplierId, name: "Supplier" },
        purchaseId: p.purchaseId || null,
        amount: Number(p.amount || 0),
        paymentMethod: p.paymentMethod || "CASH",
        bankReference: p.bankReference || null,
        notes: p.notes || "Offline Cash Disbursement",
        paymentDate: p.paymentDate || item.createdAt,
        createdAt: item.createdAt,
        isOfflinePending: true,
      };
    });

    const liveIds = new Set(livePayments.map((p) => p.id));
    const uniquePending = pendingPaymentRecords.filter((p) => !liveIds.has(p.id));

    return [...uniquePending, ...livePayments].sort(
      (a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime()
    );
  } catch (err) {
    console.error("Error creating combined supplier payments:", err);
    return livePayments;
  }
}

// Calculate Shift Profit & Loss in Offline Mode
export async function calculateOfflineShiftProfitLoss(startDate?: string, endDate?: string) {
  try {
    const [sales, expenses] = await Promise.all([
      getAllFromStore<any>("sales"),
      getAllFromStore<any>("expenses"),
    ]);

    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Infinity;

    // Filter sales in date range
    const filteredSales = sales.filter((s) => {
      const time = new Date(s.saleDate || s.createdAt).getTime();
      return time >= start && time <= end;
    });

    // Filter expenses in date range
    const filteredExpenses = expenses.filter((e) => {
      const time = new Date(e.date || e.createdAt).getTime();
      return time >= start && time <= end;
    });

    let totalRevenue = 0;
    let totalEstimatedCOGS = 0;
    const itemMap = new Map<string, {
      productId: string;
      productName: string;
      sku: string;
      totalQuantitySold: number;
      totalRevenue: number;
      totalFifoCost: number;
      grossProfit: number;
      marginPercent: number;
      isLoss: boolean;
    }>();

    for (const sale of filteredSales) {
      totalRevenue += Number(sale.grandTotal || 0);
      if (sale.items && Array.isArray(sale.items)) {
        for (const line of sale.items) {
          const qty = Number(line.quantity || 1);
          const rev = Number(line.subtotal || (Number(line.unitPrice || line.sellingPrice || 0) * qty));
          // If FIFO cost was calculated, use it; otherwise estimate cost as 70% of selling price
          const lineCost = line.fifoCost
            ? Number(line.fifoCost)
            : Number(line.costPrice || line.purchasePrice || (Number(line.unitPrice || line.sellingPrice || 0) * 0.7)) * qty;
          totalEstimatedCOGS += lineCost;

          const pId = line.productId || line.product?.id || `prod_${line.productName || line.sku || "item"}`;
          const existing = itemMap.get(pId) || {
            productId: pId,
            productName: line.product?.name || line.productName || "Product",
            sku: line.product?.sku || line.sku || "-",
            totalQuantitySold: 0,
            totalRevenue: 0,
            totalFifoCost: 0,
            grossProfit: 0,
            marginPercent: 0,
            isLoss: false,
          };

          existing.totalQuantitySold += qty;
          existing.totalRevenue += rev;
          existing.totalFifoCost += lineCost;
          existing.grossProfit = existing.totalRevenue - existing.totalFifoCost;
          existing.marginPercent = existing.totalRevenue > 0 ? (existing.grossProfit / existing.totalRevenue) * 100 : 0;
          existing.isLoss = existing.grossProfit < 0;
          itemMap.set(pId, existing);
        }
      }
    }

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const grossProfit = totalRevenue - totalEstimatedCOGS;
    const netProfit = grossProfit - totalExpenses;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const itemizedBreakdown = Array.from(itemMap.values());
    const lossItemsCount = itemizedBreakdown.filter((i) => i.isLoss).length;

    return {
      grossRevenue: totalRevenue,
      totalSalesRevenue: totalRevenue,
      totalSalesReturns: 0,
      totalReturns: 0,
      netRevenue: totalRevenue,
      revenue: totalRevenue,
      totalCOGS: totalEstimatedCOGS,
      cogs: totalEstimatedCOGS,
      grossProfit,
      grossProfitMargin,
      grossMarginPercent: grossProfitMargin,
      operatingExpenses: totalExpenses,
      expenses: totalExpenses,
      netProfit,
      netProfitMargin: netMargin,
      netMarginPercent: netMargin,
      totalSalesCount: filteredSales.length,
      totalExpensesCount: filteredExpenses.length,
      itemizedBreakdown,
      lossItemsCount,
      isEstimated: true,
      isOfflineEstimate: true,
    };
  } catch (err) {
    console.error("Error calculating offline profit/loss:", err);
    return null;
  }
}

// Calculate live dashboard stats in offline mode
export async function calculateOfflineDashboardStats() {
  try {
    const [products, buyers, suppliers, branches, sales] = await Promise.all([
      getAllFromStore<CachedProduct>("products"),
      getAllFromStore<CachedBuyer>("buyers"),
      getAllFromStore<CachedSupplier>("suppliers"),
      getAllFromStore<CachedBranch>("branches"),
      getAllFromStore<any>("sales"),
    ]);

    // Apply pending deductions to products
    const adjustedProducts = await applyOfflineDeductionsToProducts(products);

    // Apply pending credits to buyers
    const adjustedBuyers = await applyOfflineCreditsToBuyers(buyers);

    // Apply pending disbursements to suppliers
    const adjustedSuppliers = await applyOfflineDisbursementsToSuppliers(suppliers);

    // Filter today's sales
    const todayStr = new Date().toISOString().split("T")[0];
    const todaySales = sales.filter((s) => {
      const saleDate = s.saleDate || s.createdAt;
      return saleDate && saleDate.startsWith(todayStr);
    });

    const salesTodayRevenue = todaySales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
    const salesTodayCount = todaySales.length;

    // Low stock & out of stock products
    const lowStockProductsList = adjustedProducts.filter((p) => {
      const stock = Number(p.availableStock ?? 0);
      const minLevel = Number(p.minStockLevel || 5);
      return stock <= minLevel;
    });
    const outOfStockCount = adjustedProducts.filter((p) => {
      const stock = Number(p.availableStock ?? 0);
      return stock <= 0;
    }).length;

    // Customer Debt & Supplier Payables
    const totalCustomerDebt = adjustedBuyers.reduce((sum, b) => sum + Number(b.totalOutstanding || 0), 0);
    const totalSupplierPayable = adjustedSuppliers.reduce(
      (sum, s: any) => sum + Number(s.totalOutstanding || s.outstandingBalance || 0),
      0
    );

    return {
      totalProducts: adjustedProducts.length,
      salesTodayRevenue,
      salesTodayCount,
      activeBranches: branches.length > 0 ? branches.length : 1,
      lowStockProducts: lowStockProductsList.length,
      outOfStockCount,
      totalCustomerDebt,
      totalSupplierPayable,
      lowStockItems: lowStockProductsList.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        availableStock: p.availableStock,
        minStockLevel: p.minStockLevel || 5,
        sellingPrice: p.sellingPrice,
      })),
      isOfflineCalculated: true,
    };
  } catch (err) {
    console.error("Error calculating offline dashboard stats:", err);
    return null;
  }
}

// Batch pre-cache all party ledgers and application data for full offline availability
export async function precacheAllPartyLedgers(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  try {
    // 1. Fetch buyers and batch-cache their ledgers
    const buyersRes = await fetch("/api/buyers").catch(() => null);
    if (buyersRes && buyersRes.ok) {
      const buyers = await buyersRes.json();
      if (Array.isArray(buyers)) {
        await cacheCatalogData({ buyers });
        // Batch fetch ledgers for active buyers (top 50)
        for (const buyer of buyers.slice(0, 50)) {
          fetch(`/api/buyers/${buyer.id}/ledger`)
            .then((r) => (r.ok ? r.json() : null))
            .then((ledger) => {
              if (Array.isArray(ledger)) {
                cachePartyLedger(buyer.id, ledger);
              }
            })
            .catch(() => {});
        }
      }
    }

    // 2. Fetch suppliers and batch-cache their ledgers
    const suppRes = await fetch("/api/suppliers").catch(() => null);
    if (suppRes && suppRes.ok) {
      const suppliers = await suppRes.json();
      if (Array.isArray(suppliers)) {
        await cacheCatalogData({ suppliers });
        for (const supplier of suppliers.slice(0, 50)) {
          fetch(`/api/suppliers/${supplier.id}/ledger`)
            .then((r) => (r.ok ? r.json() : null))
            .then((ledger) => {
              if (Array.isArray(ledger)) {
                cachePartyLedger(`supplier_${supplier.id}`, ledger);
              }
            })
            .catch(() => {});
        }
      }
    }

    // 3. Fetch and cache purchases
    const purRes = await fetch("/api/purchases").catch(() => null);
    if (purRes && purRes.ok) {
      const purchases = await purRes.json();
      if (Array.isArray(purchases)) {
        await putManyInStore("purchases", purchases);
      }
    }

    // 4. Fetch and cache recent sales for offline invoice reviews
    const salesRes = await fetch("/api/sales").catch(() => null);
    if (salesRes && salesRes.ok) {
      const salesData = await salesRes.json();
      const salesList = Array.isArray(salesData) ? salesData : salesData?.sales || [];
      if (Array.isArray(salesList)) {
        await putManyInStore("sales", salesList.slice(0, 100));
      }
    }
  } catch (err) {
    console.warn("Background pre-caching party ledgers error:", err);
  }
}
