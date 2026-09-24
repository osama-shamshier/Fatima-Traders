"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { precacheFullApplicationData } from "@/lib/offline/cacheService";

const CORE_ROUTES = [
  "/dashboard",
  "/pos",
  "/sales",
  "/sales-returns",
  "/products",
  "/inventory",
  "/expenses",
  "/purchases",
  "/buyers",
  "/buyer-payments",
  "/buyer-due-dates",
  "/suppliers",
  "/supplier-payments",
  "/financials",
  "/profit-loss",
  "/categories",
  "/units",
  "/counters",
  "/branches",
  "/reports",
  "/stock-transfers",
  "/settings",
  "/users",
  "/roles",
  "/audit-logs",
  "/backups",
];

export function OfflineWarmupEngine() {
  const router = useRouter();
  const hasWarmedUpRef = useRef(false);

  useEffect(() => {
    // Run pre-warm when online
    const runWarmup = async () => {
      if (typeof window === "undefined" || !navigator.onLine) {
        return;
      }

      try {
        // 1. Silent client-side Next.js route prefetching (downloads JS bundles and RSC chunks)
        for (const route of CORE_ROUTES) {
          try {
            router.prefetch(route);
          } catch {
            // Non-critical
          }
        }

        // 2. Fetch HTML shells and RSC payloads in background so Service Worker caches them
        for (const route of CORE_ROUTES) {
          fetch(route, { headers: { Accept: "text/html" } }).catch(() => {});
          fetch(route, { headers: { RSC: "1" } }).catch(() => {});
        }

        // 3. Pre-cache all active catalog entities, ledgers, and reports into IndexedDB
        await precacheFullApplicationData();
        hasWarmedUpRef.current = true;
      } catch (err) {
        console.warn("Offline Warmup Engine encountered non-critical error:", err);
      }
    };

    // Trigger warmup immediately after initial mount
    const timer = setTimeout(() => {
      runWarmup();
    }, 100);

    // Periodic refresh every 5 minutes when online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        runWarmup();
      }
    }, 5 * 60 * 1000);

    // Re-warm when transitioning from offline to online
    const handleOnline = () => {
      runWarmup();
    };
    window.addEventListener("online", handleOnline);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
    };
  }, [router]);

  return null;
}
