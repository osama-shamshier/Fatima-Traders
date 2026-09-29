"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSettings } from "@/context/SettingsContext";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { settings: globalSettings, updateSettings } = useSettings();

  const [formSettings, setFormSettings] = useState(globalSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setFormSettings(globalSettings);
  }, [globalSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await updateSettings(formSettings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Error saving settings:", e);
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">{t("storeIdentity")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">{t("storeName")}</Label>
                <Input
                  required
                  value={formSettings.storeName}
                  onChange={(e) => setFormSettings({ ...formSettings, storeName: e.target.value })}
                  className="text-xs mt-1 bg-white font-medium"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">{t("phone")}</Label>
                <Input
                  value={formSettings.phone}
                  onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                  className="text-xs mt-1 bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">{t("address")}</Label>
                <Input
                  value={formSettings.address}
                  onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                  className="text-xs mt-1 bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold">Store Tagline / Subtitle (Prints & Ledgers)</Label>
                <Input
                  value={formSettings.tagline || ""}
                  onChange={(e) => setFormSettings({ ...formSettings, tagline: e.target.value })}
                  placeholder="e.g. Chemical & Packing Materials Store"
                  className="text-xs mt-1 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">{t("currencyTax")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">{t("currency")}</Label>
                <Input
                  value={formSettings.currency}
                  onChange={(e) => setFormSettings({ ...formSettings, currency: e.target.value })}
                  className="text-xs mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">{t("currencySymbol")}</Label>
                <Input
                  value={formSettings.currencySymbol}
                  onChange={(e) => setFormSettings({ ...formSettings, currencySymbol: e.target.value })}
                  className="text-xs mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">{t("taxRate")}</Label>
                <Input
                  type="number"
                  value={formSettings.taxRate}
                  onChange={(e) => setFormSettings({ ...formSettings, taxRate: e.target.value })}
                  className="text-xs mt-1 bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3">POS Thermal Receipts</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">{t("receiptHeader")}</Label>
                <Input
                  value={formSettings.receiptHeader}
                  onChange={(e) => setFormSettings({ ...formSettings, receiptHeader: e.target.value })}
                  className="text-xs mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">{t("receiptFooter")}</Label>
                <Input
                  value={formSettings.receiptFooter}
                  onChange={(e) => setFormSettings({ ...formSettings, receiptFooter: e.target.value })}
                  className="text-xs mt-1 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> {t("savedSuccess")}
              </span>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? tc("saving") : t("saveSettings")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
