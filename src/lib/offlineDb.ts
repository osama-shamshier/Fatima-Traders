import Dexie, { type Table } from "dexie";
import { ProcessSalePayload } from "./saleService";

export interface CachedProduct {
  id: string;
  sku: string;
  name: string;
  sellingPrice: number;
  unit?: { abbreviation: string };
  categoryId?: string;
  category?: { name: string };
  stock: number;
  branchId: string;
  updatedAt: string;
}

export interface CachedBuyer {
  id: string;
  name: string;
  companyName?: string | null;
  contactNumber?: string | null;
  address?: string | null;
  totalOutstanding: number;
  updatedAt: string;
}

export interface CachedBranch {
  id: string;
  name: string;
  address?: string | null;
}

export interface CachedSession {
  id: string;
  cashCounterId: string;
  branchId: string;
  status: string;
  counterName?: string;
  cashierName?: string;
  updatedAt: string;
}

export interface OfflineOutboxSale {
  id: string; // client UUID (primary key & offlineId)
  offlineInvoiceNumber: string; // OFF-2608-XXXX
  offlineCreatedAt: string;
  payload: ProcessSalePayload;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  serverInvoiceNumber?: string | null;
  error?: string | null;
  retryCount: number;
  updatedAt: string;
}

export class FatimaTradersPOSDB extends Dexie {
  products!: Table<CachedProduct, string>;
  buyers!: Table<CachedBuyer, string>;
  branches!: Table<CachedBranch, string>;
  sessions!: Table<CachedSession, string>;
  outboxSales!: Table<OfflineOutboxSale, string>;

  constructor() {
    super("FatimaTradersPOSDB");

    this.version(1).stores({
      products: "id, sku, name, branchId, categoryId",
      buyers: "id, name, contactNumber",
      branches: "id, name",
      sessions: "id, cashCounterId, branchId, status",
      outboxSales: "id, offlineInvoiceNumber, status, offlineCreatedAt",
    });
  }
}

// Client-side singleton database instance
export const offlineDb = typeof window !== "undefined" ? new FatimaTradersPOSDB() : (null as any);
