"use client";

import { useEffect, useState } from "react";
import { syncEngine } from "@/lib/offline/syncEngine";
import { SyncCenterModal } from "./SyncCenterModal";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OfflineGlobalBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Register Service Worker in browser
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("ServiceWorker registration failed:", err);
      });
    }

    const unsubscribe = syncEngine.subscribe((state) => {
      setIsOnline(state.isOnline);
      setIsSyncing(state.isSyncing);
      setPendingCount(state.pendingCount);
    });

    return unsubscribe;
  }, []);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Offline Badge */}
        {!isOnline ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors shadow-2xs"
            title="Click to view offline queue"
          >
            <WifiOff className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span>Offline</span>
            {pendingCount > 0 && (
              <span className="ms-0.5 px-1.5 py-0.2 bg-rose-600 text-white text-[10px] rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ) : isSyncing ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Syncing ({pendingCount})...</span>
          </button>
        ) : pendingCount > 0 ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>{pendingCount} Offline Saved</span>
            <span className="underline ms-1 text-[11px] text-amber-900">Sync</span>
          </button>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded-md text-emerald-700 bg-emerald-50/70 border border-emerald-150 hover:bg-emerald-100 transition-colors"
            title="All records are live and synced. Click to view Sync Center."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Online</span>
          </button>
        )}
      </div>

      <SyncCenterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
