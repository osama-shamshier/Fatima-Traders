import { Prisma, PrismaClient } from "@prisma/client";
import { consumeInventoryFIFO } from "./fifo";
import { generateInvoiceNumber } from "./utils";

type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface SaleItemPayload {
  productId: string;
  quantity: number;
  sellingPrice: number;
  discount?: number;
}

export interface ProcessSalePayload {
  offlineId?: string | null;
  offlineInvoiceNumber?: string | null;
  offlineCreatedAt?: string | Date | null;
  buyerId?: string | null;
  branchId: string;
  cashCounterId?: string | null;
  sessionId?: string | null;
  discount?: number | string | null;
  roundOff?: number | string | null;
  amountPaid?: number | string | null;
  paymentMethod?: "CASH" | "BANK_TRANSFER";
  bankName?: string | null;
  bankReference?: string | null;
  notes?: string | null;
  dueDate?: string | null;
  items: SaleItemPayload[];
}

export interface ProcessSaleOptions {
  userId: string;
  isOfflineSync?: boolean;
}

export interface StockDiscrepancy {
  productId: string;
  productName: string;
  sku: string;
  requestedQty: number;
  stockBeforeSync: number;
  resultingStock: number;
}

export interface ProcessSaleResult {
  sale: any;
  isDuplicate: boolean;
  discrepancies: StockDiscrepancy[];
}

/**
 * Single source of truth for creating a sale record.
 * Handles:
 * - Idempotency via offlineId
 * - Stock discrepancy audit detection
 * - FIFO inventory consumption
 * - Sale and SaleItem persistence
 * - Buyer payment recording
 * - Audit logging
 */
export async function createSaleRecord(
  tx: PrismaTx,
  payload: ProcessSalePayload,
  options: ProcessSaleOptions
): Promise<ProcessSaleResult> {
  const { userId, isOfflineSync = false } = options;

  // 1. Idempotency Check: if offlineId exists, return the existing sale immediately
  if (payload.offlineId) {
    const existingSale = await tx.sale.findFirst({
      where: { offlineId: payload.offlineId },
      include: {
        buyer: true,
        branch: true,
        items: { include: { product: true } },
      },
    });

    if (existingSale) {
      return {
        sale: existingSale,
        isDuplicate: true,
        discrepancies: [],
      };
    }
  }

  // 2. Validate Items
  if (!payload.items || payload.items.length === 0) {
    throw new Error("Sale must contain at least one item");
  }

  // 3. Resolve Counter Session
  let resolvedSessionId = payload.sessionId || null;
  let resolvedCashCounterId = payload.cashCounterId || null;

  if (resolvedSessionId) {
    const session = await tx.cashCounterSession.findUnique({
      where: { id: resolvedSessionId },
    });
    if (session) {
      resolvedCashCounterId = session.cashCounterId;
    } else {
      resolvedSessionId = null;
    }
  }

  // If no session provided or found, attempt finding an active open session
  if (!resolvedSessionId) {
    let openSession = null;
    if (resolvedCashCounterId) {
      openSession = await tx.cashCounterSession.findFirst({
        where: {
          cashCounterId: resolvedCashCounterId,
          status: "OPEN",
        },
      });
    }

    if (!openSession) {
      openSession = await tx.cashCounterSession.findFirst({
        where: {
          cashCounter: { branchId: payload.branchId },
          status: "OPEN",
        },
        orderBy: { openedAt: "desc" },
      });
    }

    if (openSession) {
      resolvedSessionId = openSession.id;
      resolvedCashCounterId = openSession.cashCounterId;
    }
  }

  // 4. Check Stock Discrepancies (for audit trail)
  const productIds = payload.items.map((i) => i.productId);
  const [dbProducts, currentInventories] = await Promise.all([
    tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    }),
    tx.inventory.findMany({
      where: {
        branchId: payload.branchId,
        productId: { in: productIds },
      },
      select: { productId: true, quantity: true },
    }),
  ]);

  const productMap = new Map(dbProducts.map((p) => [p.id, p]));
  const stockMap = new Map(currentInventories.map((inv) => [inv.productId, Number(inv.quantity)]));

  const discrepancies: StockDiscrepancy[] = [];
  for (const item of payload.items) {
    const currentStock = stockMap.get(item.productId) ?? 0;
    if (Number(item.quantity) > currentStock) {
      const prod = productMap.get(item.productId);
      discrepancies.push({
        productId: item.productId,
        productName: prod?.name || "Unknown Product",
        sku: prod?.sku || "N/A",
        requestedQty: Number(item.quantity),
        stockBeforeSync: currentStock,
        resultingStock: currentStock - Number(item.quantity),
      });
    }
  }

  // 5. FIFO Inventory Consumption
  const fifoResults = await consumeInventoryFIFO(tx, payload.branchId, payload.items);
  const fifoCostMap = new Map(fifoResults.map((r) => [r.productId, r.fifoCost]));

  // 6. Calculate Financial Totals
  let subtotal = 0;
  const processedItems = payload.items.map((item) => {
    const lineDiscount = Number(item.discount || 0);
    const lineTotal = Number(item.quantity) * Number(item.sellingPrice) - lineDiscount;
    subtotal += lineTotal;

    return {
      productId: item.productId,
      quantity: Number(item.quantity),
      sellingPrice: Number(item.sellingPrice),
      discount: lineDiscount,
      lineTotal,
      fifoCost: fifoCostMap.get(item.productId) || new Prisma.Decimal(0),
    };
  });

  const grandTotal = Math.max(0, subtotal - Number(payload.discount || 0) + Number(payload.roundOff || 0));
  const amountPaidNum = Math.min(grandTotal, Math.max(0, Number(payload.amountPaid || 0)));
  const outstandingAmount = Math.max(0, grandTotal - amountPaidNum);

  // Walk-in Customer Credit Validation
  if (!payload.buyerId && amountPaidNum < grandTotal) {
    throw new Error(
      "Credit sales are not allowed for Walk-in Customers. Please select a registered buyer to record partial or pending credit."
    );
  }

  const paymentStatus =
    amountPaidNum >= grandTotal ? "PAID" : amountPaidNum > 0 ? "PARTIAL" : "PENDING";

  const fullNotes = [
    payload.notes,
    payload.bankName ? `Bank/Wallet: ${payload.bankName}` : null,
    payload.bankReference ? `Ref: ${payload.bankReference}` : null,
    isOfflineSync && payload.offlineInvoiceNumber ? `Synced from: ${payload.offlineInvoiceNumber}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const officialInvoiceNumber = generateInvoiceNumber();
  const saleTimestamp = payload.offlineCreatedAt ? new Date(payload.offlineCreatedAt) : new Date();

  // 7. Persist Sale and Items
  const sale = await tx.sale.create({
    data: {
      invoiceNumber: officialInvoiceNumber,
      offlineId: payload.offlineId || null,
      offlineInvoiceNumber: payload.offlineInvoiceNumber || null,
      offlineCreatedAt: payload.offlineCreatedAt ? new Date(payload.offlineCreatedAt) : null,
      isOfflineSync,
      syncedAt: isOfflineSync ? new Date() : null,
      buyerId: payload.buyerId || null,
      branchId: payload.branchId,
      cashCounterId: resolvedCashCounterId,
      sessionId: resolvedSessionId,
      createdById: userId,
      saleDate: saleTimestamp,
      createdAt: saleTimestamp,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      subtotal: new Prisma.Decimal(subtotal),
      discount: new Prisma.Decimal(payload.discount || 0),
      roundOff: new Prisma.Decimal(payload.roundOff || 0),
      grandTotal: new Prisma.Decimal(grandTotal),
      amountPaid: new Prisma.Decimal(amountPaidNum),
      outstandingAmount: new Prisma.Decimal(outstandingAmount),
      paymentStatus,
      paymentMethod: payload.paymentMethod || "CASH",
      notes: fullNotes || null,
      items: {
        create: processedItems.map((item) => ({
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          sellingPrice: new Prisma.Decimal(item.sellingPrice),
          discount: new Prisma.Decimal(item.discount),
          lineTotal: new Prisma.Decimal(item.lineTotal),
          fifoCost: item.fifoCost,
        })),
      },
    },
    include: {
      buyer: true,
      branch: true,
      items: { include: { product: true } },
    },
  });

  // 8. Create Buyer Payment Record if initial payment was made by registered buyer
  if (amountPaidNum > 0 && payload.buyerId) {
    const bankRef = [payload.bankName, payload.bankReference].filter(Boolean).join(" - ") || null;
    await tx.buyerPayment.create({
      data: {
        buyerId: payload.buyerId,
        saleId: sale.id,
        amount: new Prisma.Decimal(amountPaidNum),
        paymentMethod: payload.paymentMethod || "CASH",
        bankReference: bankRef,
        notes: `POS Checkout Payment (${sale.invoiceNumber})`,
        createdById: userId,
        createdAt: saleTimestamp,
      },
    });
  }

  // 9. Audit Logging
  await tx.auditLog.create({
    data: {
      userId,
      entity: "sale",
      action: isOfflineSync ? "OFFLINE_SYNC" : "CREATE",
      entityId: sale.id,
      branchId: payload.branchId,
      newValues: {
        invoiceNumber: sale.invoiceNumber,
        offlineId: payload.offlineId,
        offlineInvoiceNumber: payload.offlineInvoiceNumber,
        grandTotal: sale.grandTotal.toString(),
        amountPaid: sale.amountPaid.toString(),
        outstandingAmount: sale.outstandingAmount.toString(),
        paymentStatus: sale.paymentStatus,
        itemCount: payload.items.length,
        isOfflineSync,
      },
    },
  });

  // 10. Audit Warning if Stock Discrepancies Occurred
  if (discrepancies.length > 0) {
    await tx.auditLog.create({
      data: {
        userId,
        entity: "inventory",
        action: "AUDIT_WARNING_NEGATIVE_STOCK",
        entityId: sale.id,
        branchId: payload.branchId,
        newValues: {
          saleId: sale.id,
          invoiceNumber: sale.invoiceNumber,
          offlineInvoiceNumber: payload.offlineInvoiceNumber,
          offlineCreatedAt: payload.offlineCreatedAt,
          branchId: payload.branchId,
          discrepancies: discrepancies as any,
        } as any,
      },
    });
  }

  return {
    sale,
    isDuplicate: false,
    discrepancies,
  };
}
