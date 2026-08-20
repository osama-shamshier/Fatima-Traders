"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TableLoader } from "@/components/ui/loader";
import { formatDate } from "@/lib/utils";
import { StockAdjustmentModal } from "@/components/inventory/StockAdjustmentModal";
import { Search, AlertTriangle, RefreshCw, Warehouse, ArrowLeftRight, ClipboardEdit } from "lucide-react";
import { useTranslations } from "next-intl";

export default function InventoryPage() {
  const t = useTranslations("inventory");
  const tc = useTranslations("common");

  const [activeTab, setActiveTab] = useState("current");
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (activeTab === "current") {
      fetchInventory();
    } else if (activeTab === "movements") {
      fetchMovements();
    } else if (activeTab === "adjustments") {
      fetchAdjustments();
    }
  }, [activeTab, searchQuery, branchFilter, lowStockOnly]);

  const fetchBranches = async () => {
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        setBranches(await res.json());
      }
    } catch (e) {}
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (branchFilter) params.append("branchId", branchFilter);
      if (lowStockOnly) params.append("lowStock", "true");

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        setInventory(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.append("branchId", branchFilter);

      const res = await fetch(`/api/inventory/movements?${params.toString()}`);
      if (res.ok) {
        setMovements(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (branchFilter) params.append("branchId", branchFilter);

      const res = await fetch(`/api/inventory/adjustments?${params.toString()}`);
      if (res.ok) {
        setAdjustments(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustClick = (item: any) => {
    setSelectedProduct(item);
    setIsAdjustModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm">{t("subtitle")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="current" className="rounded-lg text-xs font-semibold gap-1.5">
            <Warehouse className="w-3.5 h-3.5" /> {t("tabCurrent")}
          </TabsTrigger>
          <TabsTrigger value="movements" className="rounded-lg text-xs font-semibold gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" /> {t("tabMovements")}
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="rounded-lg text-xs font-semibold gap-1.5">
            <ClipboardEdit className="w-3.5 h-3.5" /> {t("tabAdjustments")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Current Stock */}
        <TabsContent value="current" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9 text-xs bg-slate-50"
                />
              </div>

              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-2 font-medium"
              >
                <option value="">{t("allBranches")}</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="lowStock"
                checked={lowStockOnly}
                onCheckedChange={(checked) => setLowStockOnly(!!checked)}
              />
              <Label htmlFor="lowStock" className="text-xs font-semibold text-rose-700 cursor-pointer">
                {t("lowStockOnly")}
              </Label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
                  <tr>
                    <th className="p-3.5">{t("colProduct")}</th>
                    <th className="p-3.5">{t("colSku")}</th>
                    <th className="p-3.5">{t("colCategory")}</th>
                    <th className="p-3.5">{t("colBranch")}</th>
                    <th className="p-3.5 text-center">{t("colStock")}</th>
                    <th className="p-3.5 text-center">{t("colMinLevel")}</th>
                    <th className="p-3.5 text-center">{t("colStatus")}</th>
                    <th className="p-3.5 text-right">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <TableLoader colSpan={8} text="Loading stock overview..." />
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        {t("noInventory")}
                      </td>
                    </tr>
                  ) : (
                    inventory.map((item: any) => {
                      const qty = Number(item.quantity);
                      const minStock = Number(item.product?.minStockLevel || 0);
                      const isLow = qty <= minStock;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-bold text-slate-900">{item.product?.name}</td>
                          <td className="p-3.5 font-mono text-slate-500">{item.product?.sku}</td>
                          <td className="p-3.5 text-slate-600">{item.product?.category?.name || "-"}</td>
                          <td className="p-3.5 text-slate-600">{item.branch?.name}</td>
                          <td className="p-3.5 text-center font-mono font-bold text-sm">
                            <span className={isLow ? "text-rose-600 font-black" : "text-slate-900"}>
                              {qty} {item.product?.unit?.abbreviation || ""}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono text-slate-500">
                            {minStock} {item.product?.unit?.abbreviation || ""}
                          </td>
                          <td className="p-3.5 text-center">
                            {isLow ? (
                              <Badge variant="danger" className="text-[10px] font-bold">
                                {t("statusLow")}
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] font-bold">
                                {t("statusOk")}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAdjustClick(item)}
                              className="text-xs h-7"
                            >
                              {t("adjustStock")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Stock Movements */}
        <TabsContent value="movements">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
                  <tr>
                    <th className="p-3.5">{t("colDateTime")}</th>
                    <th className="p-3.5">{t("colProduct")}</th>
                    <th className="p-3.5">{t("colBranch")}</th>
                    <th className="p-3.5">{t("colType")}</th>
                    <th className="p-3.5">{t("colReference")}</th>
                    <th className="p-3.5 text-right">{t("colQtyChange")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <TableLoader colSpan={6} text="Loading stock movements..." />
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No movement records found.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m: any) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono text-slate-500">{formatDate(m.createdAt)}</td>
                        <td className="p-3.5 font-bold text-slate-900">{m.product?.name}</td>
                        <td className="p-3.5 text-slate-600">{m.branch?.name}</td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">
                            {m.type}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-mono text-slate-500">{m.referenceId ? `#${m.referenceId.slice(0, 8)}` : "-"}</td>
                        <td className="p-3.5 text-right font-mono font-bold">
                          <span className={Number(m.quantity) > 0 ? "text-emerald-600" : "text-rose-600"}>
                            {Number(m.quantity) > 0 ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Adjustments */}
        <TabsContent value="adjustments">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
                  <tr>
                    <th className="p-3.5">{t("colDateTime")}</th>
                    <th className="p-3.5">{t("colProduct")}</th>
                    <th className="p-3.5">{t("colBranch")}</th>
                    <th className="p-3.5">{t("adjustmentType")}</th>
                    <th className="p-3.5 text-center">{t("colPreviousQty")}</th>
                    <th className="p-3.5 text-center">{t("colNewQty")}</th>
                    <th className="p-3.5">{t("colReason")}</th>
                    <th className="p-3.5">{t("colUser")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <TableLoader colSpan={8} text="Loading stock adjustments..." />
                  ) : adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No adjustment records found.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono text-slate-500">{formatDate(a.createdAt)}</td>
                        <td className="p-3.5 font-bold text-slate-900">{a.product?.name}</td>
                        <td className="p-3.5 text-slate-600">{a.branch?.name}</td>
                        <td className="p-3.5">
                          <Badge variant="warning" className="text-[10px] font-bold">
                            {a.adjustmentType}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-center font-mono">{a.previousQty}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-blue-600">{a.newQty}</td>
                        <td className="p-3.5 text-slate-600">{a.reason || "-"}</td>
                        <td className="p-3.5 text-slate-500">{a.createdBy?.name || "Admin"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {selectedProduct && (
        <StockAdjustmentModal
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setSelectedProduct(null);
          }}
          inventory={selectedProduct}
          onComplete={fetchInventory}
        />
      )}
    </div>
  );
}
