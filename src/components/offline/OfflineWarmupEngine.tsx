"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { precacheFullApplicationData } from "@/lib/offline/cacheService";

const CORE_ROUTES = [
  "/login",
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
          fetch(route, { headers: { Accept: "text/html" } })
            .then((r) => (r.ok ? r.text() : ""))
            .then((html) => {
              if (!html) return;
              // Eagerly pre-cache all page JS scripts and CSS stylesheets extracted from the HTML shell
              const scriptMatches = html.matchAll(/<script[^>]+src="([^">]+)"/g);
              for (const m of scriptMatches) {
                if (m[1] && m[1].startsWith("/_next/")) {
                  fetch(m[1]).catch(() => {});
                }
              }
              const linkMatches = html.matchAll(/<link[^>]+href="([^">]+)"/g);
              for (const m of linkMatches) {
                if (m[1] && m[1].startsWith("/_next/")) {
                  fetch(m[1]).catch(() => {});
                }
              }
            })
            .catch(() => {});
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
