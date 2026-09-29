// Resilient background sync engine for offline outbox processing
// Fatima Traders Retail Management System

import {
  getPendingOutbox,
  updateOutboxItem,
  getAllFromStore,
  setMeta,
  getMeta,
  OutboxItem,
} from "./db";
import { cacheCatalogData } from "./cacheService";

type SyncListener = (state: {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
}) => void;

class SyncEngine {
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private lastSyncTime: string | null = null;
  private lastError: string | null = null;
  private heartbeatInterval: any = null;
  private consecutiveFailures: number = 0;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private async init() {
    this.isOnline = navigator.onLine;
    this.lastSyncTime = await getMeta<string>("lastSyncTime");

    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());

    // Initial health check
    this.checkHealth();

    // Sane, stable heartbeat every 15 seconds (prevents aggressive flapping)
    this.heartbeatInterval = setInterval(() => {
      this.checkHealth();
    }, 15000);
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    // Send initial snapshot to this subscriber
    this.emitToListener(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getIsOnline(): boolean {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return false;
    }
    return this.isOnline;
  }

  // Routine individual API failures must NOT flap the global online/offline connection status
  public reportNetworkFailure() {
    // Intentionally no-op to prevent flapping when a single request times out or is aborted
  }

  // Report that a network request succeeded (confirms connectivity)
  public reportNetworkSuccess() {
    this.consecutiveFailures = 0;
    if (!this.isOnline) {
      this.isOnline = true;
      this.notify();
      this.triggerSync();
    }
  }

  private async emitToListener(listener: SyncListener) {
    const pending = await this.getPendingCount();
    try {
      listener({
        isOnline: this.getIsOnline(),
        isSyncing: this.isSyncing,
        pendingCount: pending,
        lastSyncTime: this.lastSyncTime,
        lastError: this.lastError,
      });
    } catch (e) {
      console.error("Error in sync listener:", e);
    }
  }

  private async notify() {
    const pending = await this.getPendingCount();
    const state = {
      isOnline: this.getIsOnline(),
      isSyncing: this.isSyncing,
      pendingCount: pending,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch (e) {
        console.error("Error in sync listener:", e);
      }
    });
  }

  public async getPendingCount(): Promise<number> {
    try {
      const items = await getPendingOutbox();
      return items.length;
    } catch {
      return 0;
    }
  }

  private async checkHealth() {
    if (typeof window === "undefined") return;

    // Hard offline detected by the browser network stack
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.consecutiveFailures = 2;
      if (this.isOnline) {
        this.isOnline = false;
        this.notify();
      }
      return;
    }

    try {
      // 3500ms timeout: tolerant of normal latency on cloud/mobile networks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch("/api/health", {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);

      const serverReachable = res.ok || res.status === 404;

      if (serverReachable) {
        this.consecutiveFailures = 0;
        if (!this.isOnline) {
          this.isOnline = true;
          this.notify();
          this.triggerSync();
        }
      } else {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= 2 && this.isOnline) {
          this.isOnline = false;
          this.notify();
        }
      }
    } catch {
      this.consecutiveFailures++;
      // Only transition to offline after 2 consecutive failed health checks
      // This eliminates rapid false-positive offline toggling
      if (this.consecutiveFailures >= 2 && this.isOnline) {
        this.isOnline = false;
        this.notify();
      }
    }
  }

  private handleOnline() {
    this.consecutiveFailures = 0;
    if (!this.isOnline) {
      this.isOnline = true;
      this.notify();
      this.triggerSync();
    }
    // Verify reachability in background
    this.checkHealth();
  }

  private handleOffline() {
    this.consecutiveFailures = 2;
    if (this.isOnline) {
      this.isOnline = false;
      this.notify();
    }
  }

  // Manually or automatically trigger sync
  public async triggerSync(): Promise<boolean> {
    if (this.isSyncing) return false;
    if (!this.isOnline) return false;

    this.isSyncing = true;
    this.lastError = null;
    this.notify();

    try {
      const pendingItems = await getPendingOutbox();

      if (pendingItems.length === 0) {
        this.isSyncing = false;
        this.notify();
        return true;
      }

      // Track temporary ID mappings (e.g. offline buyer ID -> server assigned buyer ID)
      const idMappings: Record<string, string> = {};

      for (const item of pendingItems) {
        await updateOutboxItem(item.id, { status: "SYNCING" });

        try {
          // Adjust payload if any referenced IDs were mapped
          const payload = { ...item.payload };
          if (payload.buyerId && idMappings[payload.buyerId]) {
            payload.buyerId = idMappings[payload.buyerId];
          }

          let response: Response;
          if (item.actionType === "SALE") {
            response = await fetch("/api/sales/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } else {
            response = await fetch(item.endpoint, {
              method: item.method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }

          if (response.ok) {
            const data = await response.json();
            // If the item created a new entity, record its mapped ID
            if (data?.id) {
              idMappings[item.id] = data.id;
            }

            await updateOutboxItem(item.id, {
              status: "SYNCED",
              serverResponse: data,
            });
          } else {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error || `Server responded with ${response.status}`;
            await updateOutboxItem(item.id, {
              status: "FAILED",
              error: errMsg,
              retryCount: (item.retryCount || 0) + 1,
            });
            this.lastError = `Failed to sync ${item.actionType}: ${errMsg}`;
          }
        } catch (itemErr: any) {
          await updateOutboxItem(item.id, {
            status: "FAILED",
            error: itemErr.message || "Network error",
            retryCount: (item.retryCount || 0) + 1,
          });
          this.lastError = itemErr.message || "Sync interrupted";
          break; // Stop further items if network dropped mid-sync
        }
      }

      this.lastSyncTime = new Date().toISOString();
      await setMeta("lastSyncTime", this.lastSyncTime);

      // Refresh catalog data from server to ensure local cache is fully updated
      this.refreshCatalogFromServer();
    } catch (error: any) {
      console.error("Sync error:", error);
      this.lastError = error.message || "Sync failed";
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return true;
  }

  // Refresh fresh product stock and buyer balances after sync
  public async refreshCatalogFromServer() {
    try {
      const [prodRes, buyerRes, catRes, branchRes, suppRes] = await Promise.all([
        fetch("/api/pos/products"),
        fetch("/api/buyers"),
        fetch("/api/categories"),
        fetch("/api/branches"),
        fetch("/api/suppliers"),
      ]);

      const data: any = {};
      if (prodRes.ok) data.products = await prodRes.json();
      if (buyerRes.ok) data.buyers = await buyerRes.json();
      if (catRes.ok) data.categories = await catRes.json();
      if (branchRes.ok) data.branches = await branchRes.json();
      if (suppRes.ok) data.suppliers = await suppRes.json();

      await cacheCatalogData(data);
    } catch (err) {
      console.warn("Could not refresh catalog after sync:", err);
    }
  }

  public getStatus() {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
    };
  }
}

// Export singleton instance
export const syncEngine = new SyncEngine();
