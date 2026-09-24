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

      if ((item.status === "PENDING" || item.status === "FAILED") && item.actionType === "PURCHASE" && item.payload?.items) {
        for (const purchaseItem of item.payload.items) {
          const pid = purchaseItem.productId;
          // Negative deduction increases effective stock in applyOfflineDeductionsToProducts
          deductions[pid] = (deductions[pid] || 0) - Number(purchaseItem.quantity || 0);
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
        const grandTotal = item.payload.grandTotal !== undefined
          ? Number(item.payload.grandTotal)
          : (item.payload.items?.reduce(
              (sum: number, it: any) => sum + (Number(it.sellingPrice || 0) - Number(it.discount || 0)) * Number(it.quantity || 1),
              0
            ) || 0) - Number(item.payload.discount || 0) + Number(item.payload.roundOff || 0);
        const amountPaid = Number(item.payload.amountPaid || 0);
        const outstanding = item.payload.outstandingAmount !== undefined
          ? Number(item.payload.outstandingAmount)
          : Math.max(0, grandTotal - amountPaid);

        if (outstanding > 0) {
          credits[buyerId] = (credits[buyerId] || 0) + outstanding;
        }
      }

      if ((item.status === "PENDING" || item.status === "FAILED") && item.actionType === "BUYER_PAYMENT" && item.payload?.buyerId) {
        const buyerId = item.payload.buyerId;
        const paymentAmount = Number(item.payload.amount || 0);
        credits[buyerId] = (credits[buyerId] || 0) - paymentAmount;
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
    const netCreditAdjustment = credits[b.id] || 0;
    return {
      ...b,
      totalOutstanding: Math.max(0, Number(b.totalOutstanding || 0) + netCreditAdjustment),
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

      if ((item.status === "PENDING" || item.status === "FAILED") && item.actionType === "PURCHASE" && item.payload?.supplierId) {
        const suppId = item.payload.supplierId;
        const outstanding = Number(item.payload.outstandingAmount || 0);
        if (outstanding > 0) {
          // Unpaid credit on purchase increases supplier payable debt
          disbursements[suppId] = (disbursements[suppId] || 0) - outstanding;
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

  // Stock adjustments are tracked via Outbox pending deductions (applyOfflineDeductionsToProducts)
  // to prevent double-decrementing against the baseline products store.

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

  let buyerObj: any = (payload as any).buyer || null;
  if (!buyerObj && payload.buyerId) {
    const buyer = await getFromStore<CachedBuyer>("buyers", payload.buyerId);
    if (buyer) {
      buyerObj = { id: buyer.id, name: buyer.name, companyName: buyer.companyName, contactNumber: buyer.contactNumber };
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
    buyer: buyerObj,
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
      subtotal,
      grandTotal,
      amountPaid: amountPaidNum,
      outstandingAmount,
      buyer: buyerObj,
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
      outbox
        .filter((o) => (o.status === "PENDING" || o.status === "FAILED") && o.actionType === "SALE")
        .map((o) => o.id)
    );

    // Any sale in outbox that might not be in cachedSales yet
    const outboxOnlySales: any[] = [];
    for (const item of outbox) {
      if ((item.status === "PENDING" || item.status === "FAILED") && item.actionType === "SALE") {
        const p = item.payload || {};
        const alreadyInCached = cachedSales.some((s) => s.id === item.id || s.clientSaleId === item.id);
        if (!alreadyInCached) {
          outboxOnlySales.push({
            id: item.id,
            clientSaleId: item.id,
            invoiceNumber: p.offlineInvoiceNumber || `OFF-${item.id.slice(-6)}`,
            saleDate: p.offlineCreatedAt || item.createdAt,
            createdAt: p.offlineCreatedAt || item.createdAt,
            dueDate: p.dueDate || null,
            subtotal: Number(p.subtotal || 0),
            discount: Number(p.discount || 0),
            roundOff: Number(p.roundOff || 0),
            grandTotal: Number(p.grandTotal || 0),
            amountPaid: Number(p.amountPaid || 0),
            outstandingAmount: Number(p.outstandingAmount || 0),
            paymentStatus:
              Number(p.amountPaid || 0) >= Number(p.grandTotal || 0)
                ? "PAID"
                : Number(p.amountPaid || 0) > 0
                ? "PARTIAL"
                : "PENDING",
            paymentMethod: p.paymentMethod || "CASH",
            buyerId: p.buyerId || null,
            buyer: p.buyer || null,
            branchId: p.branchId || null,
            items: p.items || [],
            isOffline: true,
            isOfflinePending: true,
          });
        }
      }
    }

    if (liveSales.length > 0) {
      const liveIds = new Set(liveSales.map((ls) => ls.id));
      const pendingSales = [...cachedSales, ...outboxOnlySales]
        .filter((s) => pendingSaleIds.has(s.id) || pendingSaleIds.has(s.clientSaleId))
        .map((s) => ({ ...s, isOfflinePending: true }))
        .filter((ps) => !liveIds.has(ps.id));

      return [...pendingSales, ...liveSales];
    }

    // Offline mode: liveSales is empty, return all cached sales + outbox sales
    const allSales = [...cachedSales, ...outboxOnlySales].map((s) => {
      const isPending = pendingSaleIds.has(s.id) || pendingSaleIds.has(s.clientSaleId);
      return isPending ? { ...s, isOfflinePending: true } : s;
    });

    const seen = new Set<string>();
    const deduplicated = allSales.filter((s) => {
      const key = s.id || s.clientSaleId || s.invoiceNumber;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduplicated.sort((a, b) => {
      const tA = new Date(a.saleDate || a.createdAt).getTime();
      const tB = new Date(b.saleDate || b.createdAt).getTime();
      return tB - tA;
    });
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

  // Customer outstanding balance is adjusted via outbox pending credits (getPendingOfflineBuyerCredits)
  // to avoid double-deducting against the baseline buyers store.

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
    const offlineDebitRows: any[] = [];
    const offlineCheckoutPaymentRows: any[] = [];

    pendingSales.forEach((item) => {
      const p = item.payload;
      offlineDebitRows.push({
        id: item.id,
        date: p.offlineCreatedAt || item.createdAt,
        type: "SALE",
        reference: p.offlineInvoiceNumber || "Offline Invoice",
        description: `Offline Purchase (${p.items?.length || 0} items)`,
        debit: Number(p.grandTotal || 0),
        credit: 0,
        isOfflinePending: true,
      });

      // If initial payment was made at checkout, record corresponding payment credit
      if (Number(p.amountPaid || 0) > 0) {
        offlineCheckoutPaymentRows.push({
          id: `${item.id}_checkout_payment`,
          date: p.offlineCreatedAt || item.createdAt,
          type: "PAYMENT",
          reference: p.offlineInvoiceNumber ? `INV #${p.offlineInvoiceNumber}` : "POS Payment",
          description: `Checkout Payment (${p.paymentMethod || "CASH"})`,
          debit: 0,
          credit: Number(p.amountPaid || 0),
          isOfflinePending: true,
        });
      }
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
    const allEntries = [...baseLedger, ...offlineDebitRows, ...offlineCheckoutPaymentRows, ...offlineCreditRows].sort(
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

// Combine server buyer payments with pending offline buyer payments
export async function getCombinedBuyerPayments(livePayments: any[] = []): Promise<any[]> {
  try {
    const outbox = await getAllFromStore<OutboxItem>("outbox");
    const cachedPayments = await getAllFromStore<any>("buyer_payments");
    const buyers = await getAllFromStore<CachedBuyer>("buyers");
    const buyerMap = new Map<string, CachedBuyer>();
    buyers.forEach((b) => buyerMap.set(b.id, b));

    const pendingBuyerPayments = outbox.filter(
      (o) => (o.status === "PENDING" || o.status === "FAILED") && o.actionType === "BUYER_PAYMENT"
    );

    const pendingPaymentRecords = pendingBuyerPayments.map((item) => {
      const p = item.payload;
      const buyer = buyerMap.get(p.buyerId);
      return {
        id: item.id,
        buyerId: p.buyerId,
        buyer: buyer ? { id: buyer.id, name: buyer.name, companyName: buyer.companyName } : { id: p.buyerId, name: "Customer" },
        saleId: p.saleId || null,
        amount: Number(p.amount || 0),
        paymentMethod: p.paymentMethod || "CASH",
        bankReference: p.bankReference || null,
        notes: p.notes || "Offline Cash Settlement",
        paymentDate: p.paymentDate || item.createdAt,
        createdAt: item.createdAt,
        isOfflinePending: true,
      };
    });

    if (livePayments.length > 0) {
      const liveIds = new Set(livePayments.map((p) => p.id));
      const uniquePending = pendingPaymentRecords.filter((p) => !liveIds.has(p.id));
      return [...uniquePending, ...livePayments].sort(
        (a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime()
      );
    }

    const all = [...pendingPaymentRecords, ...cachedPayments];
    const seen = new Set<string>();
    const deduplicated = all.filter((p) => {
      const key = p.id || p.clientPaymentId;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduplicated.sort(
      (a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime()
    );
  } catch (err) {
    console.error("Error creating combined buyer payments:", err);
    return livePayments;
  }
}

// Combine server purchases with pending offline purchases
export async function getCombinedPurchases(livePurchases: any[] = []): Promise<any[]> {
  try {
    const cachedPurchases = await getAllFromStore<any>("purchases");
    const outbox = await getAllFromStore<OutboxItem>("outbox");

    const pendingPurchases = outbox.filter(
      (o) => (o.status === "PENDING" || o.status === "FAILED") && o.actionType === "PURCHASE"
    );

    const pendingRecords = pendingPurchases.map((o) => {
      const p = o.payload || {};
      return {
        id: o.id,
        invoiceNumber: p.invoiceNumber || `OFF-PUR-${o.id.slice(-6)}`,
        purchaseDate: p.purchaseDate || o.createdAt,
        createdAt: o.createdAt,
        totalAmount: Number(p.totalAmount || 0),
        amountPaid: Number(p.amountPaid || 0),
        outstandingAmount: Number(p.outstandingAmount || 0),
        paymentStatus: p.paymentStatus || "PAID",
        paymentMethod: p.paymentMethod || "CASH",
        supplierId: p.supplierId,
        supplier: p.supplier || { id: p.supplierId, name: "Supplier" },
        items: p.items || [],
        isOfflinePending: true,
      };
    });

    if (livePurchases.length > 0) {
      const liveIds = new Set(livePurchases.map((lp) => lp.id));
      const uniquePending = pendingRecords.filter((pr) => !liveIds.has(pr.id));
      return [...uniquePending, ...livePurchases];
    }

    const all = [...pendingRecords, ...cachedPurchases];
    const seen = new Set<string>();
    const deduplicated = all.filter((p) => {
      const key = p.id || p.invoiceNumber;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduplicated.sort(
      (a, b) => new Date(b.purchaseDate || b.createdAt).getTime() - new Date(a.purchaseDate || a.createdAt).getTime()
    );
  } catch (err) {
    console.error("Error combining purchases:", err);
    return livePurchases;
  }
}

// Record an offline Purchase
export async function recordOfflinePurchase(payload: {
  supplierId: string;
  branchId: string;
  invoiceNumber?: string;
  purchaseDate?: string;
  amountPaid: number;
  paymentMethod: string;
  bankName?: string;
  bankReference?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    purchaseRate: number;
    newSellingPrice?: number;
  }>;
}): Promise<any> {
  const clientPurchaseId = generateClientUUID("pur");
  const invoiceNumber = payload.invoiceNumber || `OFF-PUR-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  let totalAmount = 0;
  for (const it of payload.items) {
    totalAmount += Number(it.quantity || 0) * Number(it.purchaseRate || 0);
  }
  const amountPaid = Math.min(totalAmount, Math.max(0, Number(payload.amountPaid || 0)));
  const outstandingAmount = Math.max(0, totalAmount - amountPaid);
  const paymentStatus = amountPaid >= totalAmount ? "PAID" : amountPaid > 0 ? "PARTIAL" : "PENDING";

  const supplier = await getFromStore<CachedSupplier>("suppliers", payload.supplierId);
  const branch = await getFromStore<CachedBranch>("branches", payload.branchId);

  const purchaseRecord = {
    id: clientPurchaseId,
    clientPurchaseId,
    invoiceNumber,
    purchaseDate: payload.purchaseDate || now,
    createdAt: now,
    supplierId: payload.supplierId,
    supplier: supplier || { id: payload.supplierId, name: "Supplier" },
    branchId: payload.branchId,
    branch: branch || { id: payload.branchId, name: "Branch" },
    totalAmount,
    amountPaid,
    outstandingAmount,
    paymentStatus,
    paymentMethod: payload.paymentMethod || "CASH",
    notes: payload.notes || "Offline Purchase",
    items: payload.items,
    isOffline: true,
  };

  // 1. Put in purchases store
  await putInStore("purchases", purchaseRecord);

  // 2. Update product selling price & cost price if new rates provided (stock increment is applied via getPendingOfflineDeductions)
  for (const it of payload.items) {
    const prod = await getFromStore<CachedProduct>("products", it.productId);
    if (prod) {
      if (it.newSellingPrice && Number(it.newSellingPrice) > 0) {
        prod.sellingPrice = Number(it.newSellingPrice);
      }
      if (it.purchaseRate && Number(it.purchaseRate) > 0) {
        prod.costPrice = Number(it.purchaseRate);
      }
      await putInStore("products", prod);
    }
  }

  // 3. Queue in Outbox for syncing when online
  await enqueueOutbox({
    id: generateClientUUID("outbox"),
    actionType: "PURCHASE",
    endpoint: "/api/purchases",
    method: "POST",
    payload: {
      ...payload,
      invoiceNumber,
      totalAmount,
      amountPaid,
      outstandingAmount,
      paymentStatus,
      clientPurchaseId,
    },
  });

  return purchaseRecord;
}

// Record an offline Product creation or update
export async function recordOfflineProduct(payload: {
  id?: string;
  name: string;
  sku: string;
  categoryId: string;
  unitId: string;
  description?: string;
  sellingPrice: number;
  costPrice?: number;
  minStockLevel: number;
  isActive: boolean;
}): Promise<any> {
  const isEdit = !!payload.id;
  const productId = payload.id || generateClientUUID("prod");
  const now = new Date().toISOString();

  const category = await getFromStore<CachedCategory>("categories", payload.categoryId);
  const unit = await getFromStore<any>("units", payload.unitId);
  const existingProd = isEdit ? await getFromStore<CachedProduct>("products", productId) : null;

  const productRecord: CachedProduct = {
    id: productId,
    name: payload.name,
    sku: payload.sku,
    categoryId: payload.categoryId,
    unitId: payload.unitId,
    description: payload.description || "",
    sellingPrice: Number(payload.sellingPrice || 0),
    costPrice: payload.costPrice ?? existingProd?.costPrice ?? Number(payload.sellingPrice || 0) * 0.7,
    minStockLevel: Number(payload.minStockLevel || 0),
    availableStock: existingProd?.availableStock || 0,
    isActive: payload.isActive ?? true,
    category: category || existingProd?.category || { id: payload.categoryId, name: "General" },
    unit: unit || existingProd?.unit || { id: payload.unitId, abbreviation: "pcs" },
    createdAt: existingProd?.createdAt || now,
    updatedAt: now,
  };

  await putInStore("products", productRecord);

  await enqueueOutbox({
    id: generateClientUUID("outbox"),
    actionType: "PRODUCT",
    endpoint: isEdit ? `/api/products/${productId}` : "/api/products",
    method: isEdit ? "PUT" : "POST",
    payload: {
      ...payload,
      id: productId,
    },
  });

  return productRecord;
}

// Record an offline Branch creation or update
export async function recordOfflineBranch(payload: {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}): Promise<any> {
  const isEdit = !!payload.id;
  const branchId = payload.id || generateClientUUID("branch");
  const now = new Date().toISOString();

  const existingBranch = isEdit ? await getFromStore<CachedBranch>("branches", branchId) : null;

  const branchRecord: CachedBranch = {
    id: branchId,
    name: payload.name,
    address: payload.address || "",
    phone: payload.phone || "",
    isActive: payload.isActive ?? true,
    createdAt: existingBranch?.createdAt || now,
    updatedAt: now,
  };

  await putInStore("branches", branchRecord);

  await enqueueOutbox({
    id: generateClientUUID("outbox"),
    actionType: "BRANCH",
    endpoint: isEdit ? `/api/branches/${branchId}` : "/api/branches",
    method: isEdit ? "PUT" : "POST",
    payload: {
      ...payload,
      id: branchId,
    },
  });

  return branchRecord;
}

// Calculate Cash Flow in Offline Mode
export async function calculateOfflineCashFlow(): Promise<{
  totalCashIn: number;
  totalCashOut: number;
  netCashFlow: number;
  cashSales: number;
  buyerPayments: number;
  supplierPayments: number;
  expenses: number;
  cashRefunds: number;
  breakdown: {
    salesCash: number;
    buyerPaymentsTotal: number;
    purchasesCash: number;
    supplierPaymentsTotal: number;
    operatingExpensesTotal: number;
    refundsTotal: number;
  };
  isOfflineCalculated: boolean;
}> {
  try {
    const allSales = await getCombinedSales([]);
    const buyerPayments = await getCombinedBuyerPayments([]);
    const purchases = await getAllFromStore<any>("purchases");
    const supplierPayments = await getCombinedSupplierPayments([]);
    const expenses = await getAllFromStore<any>("expenses");

    // 1. Initial cash paid at POS checkout
    const salesCash = allSales.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);

    // 2. Buyer settlements unlinked to avoid double counting
    const buyerPaymentsTotal = buyerPayments
      .filter((bp) => !bp.saleId)
      .reduce((sum, bp) => sum + Number(bp.amount || 0), 0);

    const totalCashIn = salesCash + buyerPaymentsTotal;

    // 3. Purchases cash paid
    const purchasesCash = purchases.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

    // 4. Supplier disbursements unlinked
    const supplierPaymentsTotal = supplierPayments
      .filter((sp) => !sp.purchaseId)
      .reduce((sum, sp) => sum + Number(sp.amount || 0), 0);

    // 5. Operating expenses
    const operatingExpensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const refundsTotal = 0;

    const totalCashOut = purchasesCash + supplierPaymentsTotal + operatingExpensesTotal + refundsTotal;
    const netCashFlow = totalCashIn - totalCashOut;

    return {
      totalCashIn,
      totalCashOut,
      netCashFlow,
      cashSales: salesCash,
      buyerPayments: buyerPaymentsTotal,
      supplierPayments: supplierPaymentsTotal,
      expenses: operatingExpensesTotal,
      cashRefunds: refundsTotal,
      breakdown: {
        salesCash,
        buyerPaymentsTotal,
        purchasesCash,
        supplierPaymentsTotal,
        operatingExpensesTotal,
        refundsTotal,
      },
      isOfflineCalculated: true,
    };
  } catch (err) {
    console.error("Error calculating offline cash flow:", err);
    return {
      totalCashIn: 0,
      totalCashOut: 0,
      netCashFlow: 0,
      cashSales: 0,
      buyerPayments: 0,
      supplierPayments: 0,
      expenses: 0,
      cashRefunds: 0,
      breakdown: {
        salesCash: 0,
        buyerPaymentsTotal: 0,
        purchasesCash: 0,
        supplierPaymentsTotal: 0,
        operatingExpensesTotal: 0,
        refundsTotal: 0,
      },
      isOfflineCalculated: true,
    };
  }
}

// Calculate General Ledger entries in Offline Mode
export async function calculateOfflineGeneralLedger(): Promise<any[]> {
  try {
    const allSales = await getCombinedSales([]);
    const purchases = await getAllFromStore<any>("purchases");
    const expenses = await getAllFromStore<any>("expenses");
    const buyerPayments = await getCombinedBuyerPayments([]);
    const supplierPayments = await getCombinedSupplierPayments([]);

    const entries: any[] = [];

    // Sales Revenue
    allSales.forEach((s) => {
      const total = Number(s.grandTotal || s.totalAmount || s.subtotal || 0);
      entries.push({
        date: s.saleDate || s.createdAt,
        type: "Sales Revenue",
        description: `Sale to ${s.buyer?.name || "Walk-in Customer"} (${s.paymentMethod || "CASH"})`,
        reference: `INV #${s.invoiceNumber || s.id.slice(-6)}`,
        debit: 0,
        credit: total,
      });
    });

    // Purchases
    purchases.forEach((p) => {
      const total = Number(p.totalAmount || p.grandTotal || 0);
      entries.push({
        date: p.purchaseDate || p.createdAt,
        type: "Purchase Expense",
        description: `Purchase from ${p.supplier?.name || "Supplier"}`,
        reference: `PUR #${p.invoiceNumber || p.id.slice(0, 8)}`,
        debit: total,
        credit: 0,
      });
    });

    // Expenses
    expenses.forEach((e) => {
      entries.push({
        date: e.date || e.createdAt,
        type: `Expense (${e.category?.name || e.categoryName || "General"})`,
        description: e.notes || e.description || "Operational Expense",
        reference: e.reference || "Voucher",
        debit: Number(e.amount || 0),
        credit: 0,
      });
    });

    // Unlinked buyer collections
    buyerPayments.forEach((bp) => {
      if (!bp.saleId) {
        entries.push({
          date: bp.paymentDate || bp.createdAt,
          type: "Credit Settlement",
          description: `Credit Settlement from ${bp.buyer?.name || "Customer"} (${bp.paymentMethod || "CASH"})`,
          reference: bp.bankReference ? `Ref: ${bp.bankReference}` : `REC (${bp.buyer?.name || "Customer"})`,
          debit: 0,
          credit: Number(bp.amount || 0),
        });
      }
    });

    // Unlinked supplier disbursements
    supplierPayments.forEach((sp) => {
      if (!sp.purchaseId) {
        entries.push({
          date: sp.paymentDate || sp.createdAt,
          type: "Supplier Payment",
          description: `Payment to ${sp.supplier?.name || "Supplier"} (${sp.paymentMethod || "CASH"})`,
          reference: sp.bankReference ? `Ref: ${sp.bankReference}` : `PAY (${sp.supplier?.name || "Supplier"})`,
          debit: Number(sp.amount || 0),
          credit: 0,
        });
      }
    });

    // Sort chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    return entries.map((entry) => {
      runningBalance += entry.credit - entry.debit;
      return {
        ...entry,
        balance: runningBalance,
      };
    });
  } catch (err) {
    console.error("Error calculating offline general ledger:", err);
    return [];
  }
}

// Calculate Shift Profit & Loss in Offline Mode
export async function calculateOfflineShiftProfitLoss(startDate?: string, endDate?: string) {
  try {
    const [sales, expenses] = await Promise.all([
      getCombinedSales([]),
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
      getCombinedSales([]),
    ]);

    // Apply pending deductions to products
    const adjustedProducts = await applyOfflineDeductionsToProducts(products);

    // Apply pending credits to buyers
    const adjustedBuyers = await applyOfflineCreditsToBuyers(buyers);

    // Apply pending disbursements to suppliers
    const adjustedSuppliers = await applyOfflineDisbursementsToSuppliers(suppliers);

    // Filter today's sales (using local calendar day)
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const todaySales = sales.filter((s) => {
      const d = new Date(s.saleDate || s.createdAt);
      return (
        d.getFullYear() === todayYear &&
        d.getMonth() === todayMonth &&
        d.getDate() === todayDate
      );
    });

    const salesTodayRevenue = todaySales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
    const salesTodayCount = todaySales.length;

    // Today's Payment Method breakdown
    const todayCashSales = todaySales
      .filter((s) => s.paymentMethod === "CASH" || !s.paymentMethod)
      .reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);

    const bankDetailsList = todaySales
      .filter((s) => s.paymentMethod === "BANK_TRANSFER" && Number(s.amountPaid || 0) > 0)
      .map((s) => ({
        id: s.id,
        type: "POS_SALE" as const,
        invoiceNumber: s.invoiceNumber,
        customerName: s.buyer?.name || "Walk-in Customer",
        branchName: s.branch?.name || "Main Branch",
        amount: Number(s.amountPaid || 0),
        bankName: s.bankName || "Bank Transfer",
        referenceNumber: s.bankReference || "-",
        createdAt: s.createdAt || s.saleDate,
      }));

    const todayBankSales = bankDetailsList.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const todayPendingCredit = todaySales.reduce((sum, s) => sum + Number(s.outstandingAmount || 0), 0);

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

    // Customer Debt (Receivables) & Supplier Payables
    const totalBuyerReceivables = adjustedBuyers.reduce(
      (sum, b) => sum + Number(b.totalOutstanding || 0),
      0
    );
    const totalSupplierPayables = adjustedSuppliers.reduce(
      (sum, s: any) => sum + Number(s.totalOutstanding !== undefined ? s.totalOutstanding : s.outstandingBalance || 0),
      0
    );

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);

    const recentSales = sales.slice(0, 5).map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      grandTotal: s.grandTotal,
      createdAt: s.createdAt || s.saleDate,
      buyer: s.buyer || { name: "Walk-in Customer" },
      branch: s.branch || { name: "Main Branch" },
    }));

    const outstandingDebtors = adjustedBuyers
      .filter((b) => Number(b.totalOutstanding || 0) > 0)
      .sort((a, b) => Number(b.totalOutstanding || 0) - Number(a.totalOutstanding || 0))
      .slice(0, 10);

    return {
      totalProducts: adjustedProducts.length,
      activeBranches: branches.length > 0 ? branches.length : 1,
      salesTodayRevenue,
      salesTodayCount,
      todayCashSales,
      todayBankSales,
      todayPendingCredit,
      bankDetailsList,
      totalRevenue,
      totalSupplierPayables,
      totalBuyerReceivables,
      totalCustomerDebt: totalBuyerReceivables,
      totalSupplierPayable: totalSupplierPayables,
      lowStockProducts: lowStockProductsList.length,
      outOfStockCount,
      recentSales,
      outstandingDebtors,
      lowStockList: lowStockProductsList.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        categoryName: p.category?.name || "General",
        unitAbbr: p.unit?.abbreviation || "",
        currentStock: Number(p.availableStock || 0),
        minStockLevel: Number(p.minStockLevel || 5),
        sellingPrice: Number(p.sellingPrice || 0),
        status: Number(p.availableStock || 0) <= 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
        branches: [{ branchName: "Main Branch", quantity: Number(p.availableStock || 0) }],
      })),
      isOfflineCalculated: true,
    };
  } catch (err) {
    console.error("Error calculating offline dashboard stats:", err);
    return null;
  }
}

// Batch pre-cache all party ledgers and entire application catalog data for full offline availability
export async function precacheFullApplicationData(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  try {
    // 1. Fetch & cache POS products
    fetch("/api/pos/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((products) => {
        if (Array.isArray(products)) {
          putManyInStore("products", products);
        }
      })
      .catch(() => {});

    // 2. Fetch & cache products catalog
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((products) => {
        if (Array.isArray(products)) {
          putManyInStore("products", products);
        }
      })
      .catch(() => {});

    // 3. Fetch & cache categories, branches, units
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((categories) => {
        if (Array.isArray(categories)) {
          putManyInStore("categories", categories);
        }
      })
      .catch(() => {});

    fetch("/api/branches")
      .then((r) => (r.ok ? r.json() : null))
      .then((branches) => {
        if (Array.isArray(branches)) {
          putManyInStore("branches", branches);
        }
      })
      .catch(() => {});

    fetch("/api/units")
      .then((r) => (r.ok ? r.json() : null))
      .then((units) => {
        if (Array.isArray(units)) {
          putManyInStore("units", units);
        }
      })
      .catch(() => {});

    // 4. Fetch buyers and batch-cache their ledgers
    const buyersRes = await fetch("/api/buyers").catch(() => null);
    if (buyersRes && buyersRes.ok) {
      const buyers = await buyersRes.json();
      if (Array.isArray(buyers)) {
        await putManyInStore("buyers", buyers);
        for (const buyer of buyers.slice(0, 100)) {
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

    // 5. Fetch suppliers and batch-cache their ledgers
    const suppRes = await fetch("/api/suppliers").catch(() => null);
    if (suppRes && suppRes.ok) {
      const suppliers = await suppRes.json();
      if (Array.isArray(suppliers)) {
        await putManyInStore("suppliers", suppliers);
        for (const supplier of suppliers.slice(0, 100)) {
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

    // 6. Fetch and cache purchases
    const purRes = await fetch("/api/purchases").catch(() => null);
    if (purRes && purRes.ok) {
      const purchases = await purRes.json();
      if (Array.isArray(purchases)) {
        await putManyInStore("purchases", purchases);
      }
    }

    // 7. Fetch and cache recent sales for offline invoice reviews
    const salesRes = await fetch("/api/sales").catch(() => null);
    if (salesRes && salesRes.ok) {
      const salesData = await salesRes.json();
      const salesList = Array.isArray(salesData) ? salesData : salesData?.sales || [];
      if (Array.isArray(salesList)) {
        await putManyInStore("sales", salesList.slice(0, 200));
      }
    }

    // 8. Fetch expenses and expense categories
    fetch("/api/expenses")
      .then((r) => (r.ok ? r.json() : null))
      .then((expenses) => {
        if (Array.isArray(expenses)) {
          putManyInStore("expenses", expenses);
        }
      })
      .catch(() => {});

    fetch("/api/expense-categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((cats) => {
        if (Array.isArray(cats)) {
          putManyInStore("expense_categories", cats);
        }
      })
      .catch(() => {});

    // 9. Pre-fetch financial reports so Service Worker caches their HTTP responses
    fetch("/api/financials/ledger").catch(() => {});
    fetch("/api/financials/cash-flow").catch(() => {});
    fetch("/api/reports/profit-loss").catch(() => {});
    fetch("/api/buyers/due-dates").catch(() => {});
    fetch("/api/buyer-payments").catch(() => {});
    fetch("/api/supplier-payments").catch(() => {});
  } catch (err) {
    console.warn("Background pre-caching application data error:", err);
  }
}

// Backward-compatible alias
export const precacheAllPartyLedgers = precacheFullApplicationData;
