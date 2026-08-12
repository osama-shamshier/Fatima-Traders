"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    storeName: "RetailPro Chemicals & Packing",
    currency: "PKR",
    currencySymbol: "Rs.",
    taxRate: "0",
    phone: "+92 300 1234567",
    address: "Main Market, Chemical Zone, Lahore",
    receiptHeader: "Welcome to RetailPro Store",
    receiptFooter: "Thank you for shopping with us!",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (Object.keys(data).length > 0) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert("Failed to save settings");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-slate-500 text-sm">Configure store preferences, currency format, receipt headers, and default parameters.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-b pb-4">
            <h3 className="text-base font-bold text-slate-900 mb-4">Store Identity</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Store / Business Name *</Label>
                <Input
                  required
                  value={settings.storeName}
                  onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Store Address</Label>
                <Input
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-b pb-4">
            <h3 className="text-base font-bold text-slate-900 mb-4">Currency & Financial Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Currency Code</Label>
                <Input
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  placeholder="PKR"
                />
              </div>
              <div>
                <Label>Currency Symbol</Label>
                <Input
                  value={settings.currencySymbol}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                  placeholder="Rs."
                />
              </div>
              <div>
                <Label>Default Sales Tax (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.taxRate}
                  onChange={(e) => setSettings({ ...settings, taxRate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4">Thermal Receipt Printing Options</h3>
            <div className="space-y-4">
              <div>
                <Label>Receipt Header Message</Label>
                <Input
                  value={settings.receiptHeader}
                  onChange={(e) => setSettings({ ...settings, receiptHeader: e.target.value })}
                />
              </div>
              <div>
                <Label>Receipt Footer Message</Label>
                <Input
                  value={settings.receiptFooter}
                  onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            {savedSuccess && (
              <span className="text-emerald-600 font-semibold text-sm flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" /> Settings saved successfully!
              </span>
            )}
            <div className="ml-auto">
              <Button type="submit" disabled={isSaving} className="bg-blue-600 text-white font-semibold shadow-sm">
                <Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
