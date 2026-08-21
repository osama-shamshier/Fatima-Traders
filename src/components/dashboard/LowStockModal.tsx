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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Search, ShoppingBag, X, CheckCircle2, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  unitAbbr: string;
  currentStock: number;
  minStockLevel: number;
  sellingPrice: number;
  status: "OUT_OF_STOCK" | "LOW_STOCK";
  branches?: Array<{ branchName: string; quantity: number }>;
}

interface LowStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LowStockItem[];
}

export function LowStockModal({ isOpen, onClose, items = [] }: LowStockModalProps) {
  const t = useTranslations("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OUT_OF_STOCK" | "LOW_STOCK">("ALL");

  const outOfStockCount = items.filter((i) => i.status === "OUT_OF_STOCK").length;
  const lowStockCount = items.filter((i) => i.status === "LOW_STOCK").length;

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "OUT_OF_STOCK"
        ? item.status === "OUT_OF_STOCK"
        : item.status === "LOW_STOCK";

    return matchesSearch && matchesStatus;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 bg-slate-900 text-white flex flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> {t("lowStockModalTitle")}
            </DialogTitle>
            <p className="text-xs text-slate-300">{t("lowStockModalSub")}</p>
          </div>

          <Badge
            variant="outline"
            className="bg-rose-500/20 text-rose-300 border-rose-400/40 text-xs font-bold px-3 py-1"
          >
            {items.length} {t("allAlerts")}
          </Badge>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {/* Top Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t("allAlerts")} ({items.length})
              </button>
              <button
                onClick={() => setStatusFilter("OUT_OF_STOCK")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === "OUT_OF_STOCK"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                {t("outOfStock")} ({outOfStockCount})
              </button>
              <button
                onClick={() => setStatusFilter("LOW_STOCK")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === "LOW_STOCK"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-amber-700 hover:bg-amber-50"
                }`}
              >
                {t("lowStock")} ({lowStockCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9 text-xs bg-slate-50 border-slate-200 h-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute end-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Items Table */}
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              {items.length === 0 ? t("noLowStock") : "No items match your search."}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">{t("colProduct")}</th>
                    <th className="py-2.5 px-3">{t("colCategory")}</th>
                    <th className="py-2.5 px-3 text-center">{t("colCurrentStock")}</th>
                    <th className="py-2.5 px-3 text-center">{t("colMinStock")}</th>
                    <th className="py-2.5 px-3 text-center">{t("colStatus")}</th>
                    <th className="py-2.5 px-3 text-right">{t("colAction")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const isOut = item.status === "OUT_OF_STOCK";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <span className="font-mono text-[11px] text-slate-400">{item.sku}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium text-[11px]">
                            {item.categoryName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`font-mono font-black text-sm ${
                              isOut ? "text-rose-600" : "text-amber-600"
                            }`}
                          >
                            {item.currentStock} {item.unitAbbr}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                          {item.minStockLevel} {item.unitAbbr}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant={isOut ? "danger" : "warning"}
                            className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider"
                          >
                            {isOut ? t("outOfStock") : t("lowStock")}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/purchases`}
                            onClick={onClose}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold text-[11px] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <ShoppingBag className="w-3 h-3" /> {t("reorderStock")}
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center sm:justify-between">
          <span className="text-xs text-slate-500">
            Showing {filteredItems.length} of {items.length} items
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
