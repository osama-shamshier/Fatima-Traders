"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { OfflineOutboxSale } from "@/lib/offlineDb";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Database,
  CloudSync,
} from "lucide-react";

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  outboxItems: OfflineOutboxSale[];
  onTriggerSync: () => Promise<void>;
  onClearSynced: () => Promise<void>;
  onCacheCatalog: () => Promise<any>;
}

export function OfflineSyncModal({
  isOpen,
  onClose,
  isOnline,
  isSyncing,
  pendingCount,
  failedCount,
  outboxItems,
  onTriggerSync,
  onClearSynced,
  onCacheCatalog,
}: OfflineSyncModalProps) {
  const [isCaching, setIsCaching] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  const handleRefreshCatalog = async () => {
    setIsCaching(true);
    setCacheMessage(null);
    try {
      const res = await onCacheCatalog();
      setCacheMessage(`Cached ${res.productCount} products and ${res.buyerCount} customers locally!`);
    } catch (e: any) {
      setCacheMessage(`Failed to cache: ${e.message}`);
    } finally {
      setIsCaching(false);
    }
  };

  const syncedCount = outboxItems.filter((i) => i.status === "SYNCED").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
        {/* Header */}
        <DialogHeader className="p-5 bg-slate-900 text-white flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" /> Offline Sync & Cache Manager
            </DialogTitle>
            <p className="text-xs text-slate-300">
              Manage local IndexedDB transactions, server sync queue, and offline catalog.
            </p>
          </div>

          <Badge
            variant="outline"
            className={`px-3 py-1 text-xs font-bold gap-1.5 ${
              isOnline
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                : "bg-amber-500/20 text-amber-300 border-amber-400/40"
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? "Server Online" : "Offline Mode"}
          </Badge>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                Pending Sync
              </span>
              <span className="text-xl font-black font-mono text-amber-900">{pendingCount}</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Synced to Cloud
              </span>
              <span className="text-xl font-black font-mono text-emerald-900">{syncedCount}</span>
            </div>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                Failed Sync
              </span>
              <span className="text-xl font-black font-mono text-rose-900">{failedCount}</span>
            </div>
          </div>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onTriggerSync}
                disabled={!isOnline || isSyncing || pendingCount + failedCount === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Pending Now"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleRefreshCatalog}
                disabled={!isOnline || isCaching}
                className="text-xs font-semibold gap-1.5 bg-white shadow-2xs"
              >
                <Database className={`w-3.5 h-3.5 ${isCaching ? "animate-spin" : ""}`} />
                {isCaching ? "Updating..." : "Update Local Cache"}
              </Button>
            </div>

            {syncedCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearSynced}
                className="text-xs text-slate-500 hover:text-rose-600 gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Synced
              </Button>
            )}
          </div>

          {cacheMessage && (
            <p className="text-xs text-blue-600 font-medium bg-blue-50 p-2.5 rounded-lg border border-blue-100">
              {cacheMessage}
            </p>
          )}

          {/* Outbox Transactions List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Offline Transactions Queue ({outboxItems.length})
            </h4>

            {outboxItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All transactions are synchronized with the cloud server!
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {outboxItems.map((item) => {
                    const total = item.payload.items.reduce(
                      (sum, i) => sum + Number(i.quantity) * Number(i.sellingPrice) - Number(i.discount || 0),
                      0
                    );

                    return (
                      <div
                        key={item.id}
                        className="p-3 hover:bg-slate-50/80 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              {item.offlineInvoiceNumber}
                            </span>
                            {item.serverInvoiceNumber && (
                              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                Server: {item.serverInvoiceNumber}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block">
                            {formatDateTime(item.offlineCreatedAt)} • {item.payload.items.length} items
                          </span>
                          {item.error && (
                            <span className="text-[11px] text-rose-600 font-medium block mt-0.5">
                              Error: {item.error}
                            </span>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="font-extrabold font-mono text-slate-900">
                            {formatCurrency(total)}
                          </span>
                          <Badge
                            variant={
                              item.status === "SYNCED"
                                ? "success"
                                : item.status === "FAILED"
                                ? "danger"
                                : "warning"
                            }
                            className="text-[10px] px-2 py-0"
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
