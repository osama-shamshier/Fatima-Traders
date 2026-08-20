"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, DollarSign, Filter, AlertTriangle, Package, CheckCircle, Calendar, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useTranslations } from "next-intl";

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

  const fetchBranchesAndProducts = async () => {
    try {
      const [bRes, pRes] = await Promise.all([
        fetch("/api/branches"),
        fetch("/api/products"),
      ]);
      if (bRes.ok) setBranches(await bRes.json());
      if (pRes.ok) setProducts(await pRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProfitLoss = async () => {
    setIsLoading(true);
    try {
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
      }
    } catch (e) {
      console.error("Failed to fetch P&L data", e);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProfitLoss}>
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
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "custom", label: "Custom Range" },
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
            <Label className="text-[11px] font-semibold text-slate-600">{tc("product") || "Product"}</Label>
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
                <Label className="text-[11px] font-semibold text-slate-600">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs py-1 px-2 bg-slate-50 mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] font-semibold text-slate-600">End Date</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs py-1 px-2 bg-slate-50"
                  />
                  <Button type="submit" size="sm" className="bg-blue-600 text-white text-xs font-semibold shrink-0">
                    {t("applyFilters")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </form>
      </div>

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
            {showLossOnly ? "Showing Loss Items" : t("showLossOnly")}
          </Button>
        </div>
      )}

      {/* Top Level Financial Performance Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        {/* Gross Revenue */}
        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("grossSales")}</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-slate-900">
              {formatCurrency(plData?.totalSalesRevenue || 0)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Billed orders before returns</p>
          </CardContent>
        </Card>

        {/* Sales Returns Impact */}
        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("salesReturns")}</CardTitle>
            <RotateCcw className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-rose-600">
              -{formatCurrency(plData?.totalSalesReturns || 0)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Returned items and customer refunds</p>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("netRevenue")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-emerald-600">
              {formatCurrency(plData?.netRevenue || 0)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Gross Sales - Sales Returns</p>
          </CardContent>
        </Card>

        {/* FIFO COGS */}
        <Card className="shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500">{t("cogs")}</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-extrabold font-mono text-orange-600">
              {formatCurrency(plData?.totalCOGS || 0)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">FIFO inventory layer purchase cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Profit Margin Summary Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {/* Gross Profit */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-bold uppercase">{t("grossProfit")}</span>
            <div className="text-2xl font-black font-mono text-emerald-600 mt-1">
              {formatCurrency(plData?.grossProfit || 0)}
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Margin: <strong>{Number(plData?.grossProfitMargin || 0).toFixed(1)}%</strong>
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-bold uppercase">{t("operatingExpenses")}</span>
            <div className="text-2xl font-black font-mono text-rose-600 mt-1">
              {formatCurrency(plData?.operatingExpenses || 0)}
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Rent, utilities, packaging & bills</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className="p-4 bg-slate-900 text-white rounded-xl shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-bold uppercase">{t("netProfit")}</span>
            <div className={`text-2xl font-black font-mono mt-1 ${
              Number(plData?.netProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {formatCurrency(plData?.netProfit || 0)}
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Net Margin: <strong>{Number(plData?.netProfitMargin || 0).toFixed(1)}%</strong>
            </span>
          </div>
          <div className={`p-3 rounded-xl ${Number(plData?.netProfit || 0) >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Itemized Profitability & Margins Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
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
              {showLossOnly ? "Show All Products" : `Filter ${lossCount} Loss Items`}
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
                          Selling below FIFO unit cost!
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
                        {Number(item.marginPercent).toFixed(1)}% margin
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
