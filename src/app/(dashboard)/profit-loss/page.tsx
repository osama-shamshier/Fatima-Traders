"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import {
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Filter,
  AlertTriangle,
  Package,
  RotateCcw,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { generateProfitLossPDF, exportProfitLossCSV } from "@/lib/pdfExport";
import { calculateOfflineShiftProfitLoss, getOfflineProducts } from "@/lib/offline/cacheService";
import { getAllFromStore } from "@/lib/offline/db";

export default function ProfitLossPage() {
  const t = useTranslations("profitLoss");
  const tc = useTranslations("common");

  const [plData, setPlData] = useState<any | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Filter States
  const [period, setPeriod] = useState<string>("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showLossOnly, setShowLossOnly] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBranchesAndProducts();
  }, []);

  useEffect(() => {
    fetchProfitLoss();
  }, [period, selectedBranchId, selectedProductId]);

  useEffect(() => {
    const handleOnline = () => {
      fetchBranchesAndProducts();
      fetchProfitLoss();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [period, selectedBranchId, selectedProductId, startDate, endDate]);

  const fetchBranchesAndProducts = async () => {
    try {
      const [bRes, pRes] = await Promise.all([
        fetch("/api/branches").catch(() => null),
        fetch("/api/products").catch(() => null),
      ]);
      if (bRes && bRes.ok) {
        setBranches(await bRes.json());
      } else {
        const cachedB = await getAllFromStore<any>("branches");
        if (cachedB && cachedB.length > 0) setBranches(cachedB);
      }
      if (pRes && pRes.ok) {
        setProducts(await pRes.json());
      } else {
        const cachedP = await getOfflineProducts();
        if (cachedP && cachedP.length > 0) setProducts(cachedP);
      }
    } catch (e) {
      console.error(e);
      const cachedB = await getAllFromStore<any>("branches");
      if (cachedB && cachedB.length > 0) setBranches(cachedB);
      const cachedP = await getOfflineProducts();
      if (cachedP && cachedP.length > 0) setProducts(cachedP);
    }
  };

  const getFilterBounds = () => {
    let filterStart: string | undefined = undefined;
    let filterEnd: string | undefined = undefined;
    const now = new Date();

    if (period === "today") {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filterStart = d.toISOString();
    } else if (period === "this_week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      filterStart = d.toISOString();
    } else if (period === "this_month") {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      filterStart = d.toISOString();
    } else if (period === "last_month") {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      filterStart = first.toISOString();
      filterEnd = last.toISOString();
    } else if (period === "custom") {
      if (startDate) filterStart = new Date(startDate + "T00:00:00").toISOString();
      if (endDate) filterEnd = new Date(endDate + "T23:59:59").toISOString();
    }
    return { filterStart, filterEnd };
  };

  const fetchProfitLoss = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== "undefined" && !navigator.onLine) {
        const { filterStart, filterEnd } = getFilterBounds();
        const offlineReport = await calculateOfflineShiftProfitLoss(filterStart, filterEnd);
        if (offlineReport) setPlData(offlineReport);
        return;
      }

      const params = new URLSearchParams();
      if (period !== "all") params.append("period", period);
      if (selectedBranchId) params.append("branchId", selectedBranchId);
      if (selectedProductId) params.append("productId", selectedProductId);
      if (period === "custom") {
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
      }

      const res = await fetch(`/api/reports/profit-loss?${params.toString()}`);
      if (res.ok) {
        setPlData(await res.json());
      } else {
        const { filterStart, filterEnd } = getFilterBounds();
        const offlineReport = await calculateOfflineShiftProfitLoss(filterStart, filterEnd);
        if (offlineReport) setPlData(offlineReport);
      }
    } catch (e) {
      console.warn("Server P&L fetch failed, falling back to local offline shift calculations:", e);
      const { filterStart, filterEnd } = getFilterBounds();
      const offlineReport = await calculateOfflineShiftProfitLoss(filterStart, filterEnd);
      if (offlineReport) setPlData(offlineReport);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProfitLoss();
  };

  const itemizedItems = plData?.itemizedBreakdown || [];
  const filteredBreakdown = showLossOnly
    ? itemizedItems.filter((item: any) => item.isLoss)
    : itemizedItems;

  const lossCount = plData?.lossItemsCount || 0;

  const getPeriodLabel = (): string => {
    switch (period) {
      case "today":
        return "Today";
      case "this_week":
        return "This Week";
      case "this_month":
        return "This Month";
      case "last_month":
        return "Last Month";
      case "custom":
        return startDate && endDate ? `${startDate} to ${endDate}` : "Custom Range";
      default:
        return "All Time";
    }
  };

  const getBranchLabel = (): string => {
    if (!selectedBranchId) return "All Branches";
    const found = branches.find((b) => b.id === selectedBranchId);
    return found ? found.name : "All Branches";
  };

  const getProductLabel = (): string => {
    if (!selectedProductId) return "All Products";
    const found = products.find((p) => p.id === selectedProductId);
    return found ? found.name : "All Products";
  };

  const handleDownloadPDF = () => {
    try {
      if (!plData) return;
      generateProfitLossPDF({
        periodLabel: getPeriodLabel(),
        branchName: getBranchLabel(),
        productName: getProductLabel(),
        plData,
        storeName: "FATIMA TRADERS",
      });
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleDownloadCSV = () => {
    try {
      if (!plData) return;
      exportProfitLossCSV({
        periodLabel: getPeriodLabel(),
        branchName: getBranchLabel(),
        productName: getProductLabel(),
        plData,
      });
    } catch (err) {
      console.error("CSV download error:", err);
      alert("Failed to export CSV. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF Button */}
          <Button
            onClick={handleDownloadPDF}
            disabled={!plData || isLoading}
            variant="outline"
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs border-slate-300 text-xs h-9 gap-1.5"
            title="Download formatted Profit & Loss PDF report"
          >
            <FileText className="h-4 w-4 text-rose-600" />
            <span>{t("downloadPdf")}</span>
          </Button>

          {/* Export CSV Button */}
          <Button
            onClick={handleDownloadCSV}
            disabled={!plData || isLoading}
            variant="outline"
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs border-slate-300 text-xs h-9 gap-1.5"
            title="Export P&L statement to CSV/Excel spreadsheet"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{t("downloadCsv")}</span>
          </Button>

          <Button variant="outline" size="sm" onClick={fetchProfitLoss} className="h-9">
            <RefreshCw className="w-4 h-4 me-2" /> {t("refreshData")}
          </Button>
        </div>
      </div>

      {/* Date Period & Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase">{t("filterTitle")}</span>
          </div>

          {/* Filter Quick Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: tc("allTime") },
              { id: "today", label: tc("today") },
              { id: "this_week", label: tc("thisWeek") },
              { id: "this_month", label: tc("thisMonth") },
              { id: "last_month", label: tc("lastMonth") },
              { id: "custom", label: tc("customRange") },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  period === p.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Extended Filter Dropdowns */}
        <form onSubmit={handleApplyFilter} className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <Label className="text-[11px] font-semibold text-slate-600">{tc("branch")}</Label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="input text-xs bg-slate-50 mt-1 w-full"
            >
              <option value="">{t("allBranches")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-slate-600">{tc("product")}</Label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="input text-xs bg-slate-50 mt-1 w-full"
            >
              <option value="">{t("allProducts")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {period === "custom" && (
            <>
              <div>
                <Label className="text-[11px] font-semibold text-slate-600">{tc("startDate")}</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs py-1 px-2 bg-slate-50 mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-600">{tc("endDate")}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs py-1 px-2 bg-slate-50"
                  />
                  <Button type="submit" size="sm" className="bg-blue-600 text-white text-xs font-semibold shrink-0">
                    {tc("apply")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>

      {/* Offline Mode Indicator Banner */}
      {plData?.isOfflineEstimate && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                ⚡ Offline Mode Shift Calculation
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Estimated from local transactions and catalog cost prices. Official multi-branch FIFO ledger will synchronize automatically upon network restoration.
              </p>
            </div>
          </div>
          <Badge variant="warning" className="bg-amber-100 text-amber-800 border-amber-300 font-bold shrink-0">
            Local Estimate
          </Badge>
        </div>
      )}

      {/* Loss Warning Banner if any items selling below cost */}
      {lossCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-900 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700">{t("lossAlertTitle")}</h4>
              <p className="text-xs text-rose-600 mt-0.5">{t("lossAlertDesc", { count: lossCount })}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLossOnly(!showLossOnly)}
            className={`text-xs font-bold border-rose-300 text-rose-700 hover:bg-rose-100 ${
              showLossOnly ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-white"
            }`}
          >
            {showLossOnly ? t("showAllProducts") : t("filterLossItems", { count: lossCount })}
          </Button>
        </div>
      )}

      {/* Top Level Financial Performance Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        {/* Gross Revenue */}
        <Card className="shadow-2xs bg-white border border-slate-200 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("grossSales")}</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-slate-900">
              {formatCurrency(plData?.totalSalesRevenue ?? plData?.grossRevenue ?? 0)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t("billedBeforeReturns")}</p>
          </CardContent>
        </Card>

        {/* Sales Returns Impact */}
        <Card className="shadow-2xs bg-white border border-slate-200 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("salesReturns")}</CardTitle>
            <RotateCcw className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-rose-600">
              -{formatCurrency(plData?.totalSalesReturns ?? plData?.totalReturns ?? 0)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t("returnedRefunds")}</p>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className="shadow-2xs bg-white border border-slate-200 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("netRevenue")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-emerald-600">
              {formatCurrency(plData?.netRevenue ?? plData?.revenue ?? 0)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t("grossMinusReturns")}</p>
          </CardContent>
        </Card>

        {/* FIFO COGS */}
        <Card className="shadow-2xs bg-white border border-slate-200 rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("cogs")}</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-orange-600">
              {formatCurrency(plData?.totalCOGS ?? plData?.cogs ?? 0)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t("fifoCostSub")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Margin Summary Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Gross Profit */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-bold uppercase">{t("grossProfit")}</span>
            <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
              {formatCurrency(plData?.grossProfit ?? 0)}
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {t("margin")}: <strong>{Number(plData?.grossProfitMargin ?? plData?.grossMarginPercent ?? 0).toFixed(1)}%</strong>
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-bold uppercase">{t("operatingExpenses")}</span>
            <div className="text-2xl font-black font-mono text-rose-600 mt-1">
              {formatCurrency(plData?.operatingExpenses ?? plData?.expenses ?? 0)}
            </div>
            <span className="text-[11px] font-semibold text-slate-500">{t("rentUtilitiesBills")}</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Net Operating Profit (Clean Consistent Light Theme) */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-bold uppercase">{t("netProfit")}</span>
            <div className={`text-2xl font-black font-mono mt-1 ${
              Number(plData?.netProfit ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}>
              {formatCurrency(plData?.netProfit ?? 0)}
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {t("netMargin")}: <strong>{Number(plData?.netProfitMargin ?? plData?.netMarginPercent ?? 0).toFixed(1)}%</strong>
            </span>
          </div>
          <div className={`p-3 rounded-xl ${Number(plData?.netProfit ?? 0) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Itemized Profitability & Margins Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              {t("itemizedBreakdown")} ({filteredBreakdown.length})
            </h3>
          </div>
          {lossCount > 0 && (
            <button
              onClick={() => setShowLossOnly(!showLossOnly)}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800"
            >
              {showLossOnly ? t("showAllProducts") : t("filterLossItems", { count: lossCount })}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3.5">{t("colProduct")}</th>
                <th className="p-3.5">{t("colSku")}</th>
                <th className="p-3.5 text-center">{t("colQtySold")}</th>
                <th className="p-3.5 text-right">{t("colRevenue")}</th>
                <th className="p-3.5 text-right">{t("colFifoCost")}</th>
                <th className="p-3.5 text-right">{t("colProfitMargin")}</th>
                <th className="p-3.5 text-center">{t("colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableLoader colSpan={7} text="Calculating item profitability..." />
              ) : filteredBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {t("noItems")}
                  </td>
                </tr>
              ) : (
                filteredBreakdown.map((item: any) => (
                  <tr
                    key={item.productId}
                    className={`transition-colors ${
                      item.isLoss ? "bg-rose-50/60 hover:bg-rose-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="p-3.5 font-bold text-slate-900">
                      {item.productName}
                      {item.isLoss && (
                        <span className="text-[10px] text-rose-600 font-normal block">
                          {t("sellingBelowCost")}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">{item.sku}</td>
                    <td className="p-3.5 text-center font-mono font-bold">{item.totalQuantitySold}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      {formatCurrency(item.totalFifoCost)}
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      <div className={`font-bold ${item.isLoss ? "text-rose-600" : "text-emerald-600"}`}>
                        {formatCurrency(item.grossProfit)}
                      </div>
                      <span className={`text-[10px] font-semibold ${item.isLoss ? "text-rose-500" : "text-slate-400"}`}>
                        {Number(item.marginPercent).toFixed(1)}% {t("margin")}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge
                        variant={item.isLoss ? "danger" : "success"}
                        className="text-[10px] font-bold"
                      >
                        {item.isLoss ? t("statusLoss") : t("statusProfitable")}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
