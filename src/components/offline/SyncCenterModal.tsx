"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { syncEngine } from "@/lib/offline/syncEngine";
import { getAllFromStore, OutboxItem } from "@/lib/offline/db";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, Wifi, WifiOff, ShoppingBag, Receipt, UserPlus } from "lucide-react";

interface SyncCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncCenterModal({ isOpen, onClose }: SyncCenterModalProps) {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOutbox();
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((state) => {
      setIsOnline(state.isOnline);
      setIsSyncing(state.isSyncing);
      setLastSyncTime(state.lastSyncTime);
      if (isOpen) {
        loadOutbox();
      }
    });
    return unsubscribe;
  }, [isOpen]);

  const loadOutbox = async () => {
    try {
      const all = await getAllFromStore<OutboxItem>("outbox");
      // Sort newest first
      setItems(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error("Error loading outbox:", err);
    }
  };

  const handleManualSync = async () => {
    await syncEngine.triggerSync();
    await loadOutbox();
  };

  const pendingCount = items.filter((i) => i.status === "PENDING" || i.status === "FAILED").length;
  const syncedCount = items.filter((i) => i.status === "SYNCED").length;

  const renderActionIcon = (type: string) => {
    switch (type) {
      case "SALE":
        return <ShoppingBag className="w-4 h-4 text-blue-600" />;
      case "EXPENSE":
        return <Receipt className="w-4 h-4 text-amber-600" />;
      case "BUYER":
        return <UserPlus className="w-4 h-4 text-emerald-600" />;
      default:
        return <RefreshCw className="w-4 h-4 text-slate-500" />;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "SYNCED":
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Synced
          </Badge>
        );
      case "SYNCING":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs animate-pulse">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Syncing
          </Badge>
        );
      case "FAILED":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 text-blue-600 ${isSyncing ? "animate-spin" : ""}`} />
              Offline Sync Center
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <Wifi className="w-3.5 h-3.5" /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  <WifiOff className="w-3.5 h-3.5" /> Offline Mode
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 my-2">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-700 font-medium">Pending to Sync</p>
            <p className="text-xl font-bold text-amber-900">{pendingCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-xs text-emerald-700 font-medium">Successfully Synced</p>
            <p className="text-xl font-bold text-emerald-900">{syncedCount}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">Last Sync</p>
            <p className="text-xs font-semibold text-slate-700 mt-1">
              {lastSyncTime ? formatDateTime(lastSyncTime) : "Never"}
            </p>
          </div>
        </div>

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[360px] pr-1 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-600">No offline transactions</p>
              <p className="text-xs text-slate-400">All local operations are fully in sync with the server.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-md border border-slate-150">
                    {renderActionIcon(item.actionType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{item.actionType}</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {item.payload?.offlineInvoiceNumber || item.id}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {formatDateTime(item.createdAt)}
                      {item.payload?.grandTotal !== undefined && (
                        <span className="ms-2 font-semibold text-slate-700">
                          {formatCurrency(item.payload.grandTotal)}
                        </span>
                      )}
                      {item.payload?.amount !== undefined && (
                        <span className="ms-2 font-semibold text-slate-700">
                          {formatCurrency(item.payload.amount)}
                        </span>
                      )}
                    </p>
                    {item.error && (
                      <p className="text-rose-600 text-[11px] mt-1 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {item.error}
                      </p>
                    )}
                  </div>
                </div>

                <div>{renderStatusBadge(item.status)}</div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>

          <Button
            size="sm"
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline || pendingCount === 0}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing now..." : `Sync Now (${pendingCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
