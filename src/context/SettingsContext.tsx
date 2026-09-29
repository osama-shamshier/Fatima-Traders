"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { putInStore, getFromStore } from "@/lib/offline/db";

export interface AppSettings {
  storeName: string;
  currency: string;
  currencySymbol: string;
  taxRate: string;
  phone: string;
  address: string;
  receiptHeader: string;
  receiptFooter: string;
  tagline?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  storeName: "FATIMA TRADERS",
  currency: "PKR",
  currencySymbol: "Rs.",
  taxRate: "0",
  phone: "0334-7776934",
  address: "Purani Ghalla Mandi, Ahmad Pur East",
  receiptHeader: "FATIMA TRADERS (Ahmad Pur East)",
  receiptFooter: "Thank you for shopping with us! برائے رابطہ: 0334-7776934",
  tagline: "Chemical & Packing Materials Store",
};

const SETTINGS_STORAGE_KEY = "app_settings";
const SETTINGS_EVENT = "app:settings-updated";

export function getCachedSettings(): AppSettings {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // ignore JSON parse or access error
    }
  }
  return DEFAULT_SETTINGS;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => false,
  refreshSettings: async () => {},
  isLoading: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => getCachedSettings());
  const [isLoading, setIsLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      // 1. Try local IndexedDB meta store in case localStorage was empty
      try {
        const metaItem = await getFromStore<any>("meta", "app_settings");
        if (metaItem && metaItem.value) {
          setSettings((prev) => {
            const merged = { ...prev, ...metaItem.value };
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
              } catch {}
            }
            return merged;
          });
        }
      } catch {
        // ignore indexeddb error
      }

      // 2. Fetch from server API
      const res = await fetch("/api/settings", { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setSettings((prev) => {
            const merged = { ...prev, ...data };
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
              } catch {}
            }
            return merged;
          });

          // Cache in IndexedDB meta
          try {
            await putInStore("meta", { key: "app_settings", value: data });
          } catch {}
        }
      }
    } catch (e) {
      console.warn("Could not fetch remote settings, using local settings cache:", e);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Listen for custom settings updated events in the same tab
    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<AppSettings>;
      if (customEvent.detail) {
        setSettings((prev) => ({ ...prev, ...customEvent.detail }));
      } else {
        setSettings(getCachedSettings());
      }
    };

    // Listen for storage events across other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setSettings((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    };

    window.addEventListener(SETTINGS_EVENT, handleSettingsUpdated);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(SETTINGS_EVENT, handleSettingsUpdated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<boolean> => {
    setIsLoading(true);
    const merged = { ...settings, ...newSettings };

    // 1. Immediately update state
    setSettings(merged);

    // 2. Persist synchronously to localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: merged }));
      } catch (err) {
        console.error("Failed to write to localStorage:", err);
      }
    }

    // 3. Persist to IndexedDB meta store
    try {
      await putInStore("meta", { key: "app_settings", value: merged });
    } catch (err) {
      console.warn("Failed to write settings to IndexedDB:", err);
    }

    // 4. Send to server API
    let success = true;
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
      });
      if (!res.ok) {
        console.warn("Server POST /api/settings returned status", res.status);
      }
    } catch (err) {
      console.warn("Server unavailable, saved settings locally:", err);
    } finally {
      setIsLoading(false);
    }

    return success;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        refreshSettings: fetchSettings,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      settings: getCachedSettings(),
      updateSettings: async () => false,
      refreshSettings: async () => {},
      isLoading: false,
    };
  }
  return context;
}
