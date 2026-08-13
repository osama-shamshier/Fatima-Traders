"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, DollarSign, Filter, AlertTriangle, Package, CheckCircle, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ProfitLossPage() {
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
          <h1 className="text-2xl font-bold text-slate-900">Profit & Loss Statement & Item Profitability</h1>
          <p className="text-slate-500 text-sm">Itemized gross margin analysis based on FIFO inventory cost of goods sold (COGS).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProfitLoss}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Data
          </Button>
        </div>
      </div>

      {/* Date Period & Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase">Profit & Loss Period Filter</span>
          </div>

          {/* Quick Period Filter Pills */}
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

        {/* Secondary Filters (Branch, Product, Custom Date Range) */}
        <form onSubmit={handleApplyFilter} className="flex flex-wrap items-end gap-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Filter Branch</Label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="input text-xs py-1 px-3 bg-slate-50"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 min-w-[200px]">
            <Label className="text-xs font-semibold">Filter Specific Product</Label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="input text-xs py-1 px-3 bg-slate-50"
            >
              <option value="">All Products / Items</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {period === "custom" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs py-1 px-2 bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs py-1 px-2 bg-slate-50"
                />
              </div>

              <Button type="submit" size="sm" className="bg-blue-600 text-white font-semibold">
                <Filter className="w-3.5 h-3.5 mr-1" /> Apply Date
              </Button>
            </>
          )}
        </form>
      </div>

      {/* Loss-Making Items Warning Banner */}
      {lossCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                ⚠️ Loss Alert: {lossCount} product(s) are selling at a loss!
              </h4>
              <p className="text-xs text-rose-700">Cost of Goods Sold (COGS) exceeds revenue for these items in the selected period.</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowLossOnly(!showLossOnly)}
            className={`text-xs font-bold ${
              showLossOnly ? "bg-slate-900 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"
            }`}
          >
            {showLossOnly ? "Show All Items" : "View Loss-Making Items Only"}
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Gross Revenue (Sales)</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(plData?.revenue || 0)}</div>
            <p className="text-[11px] text-slate-400 mt-1">Total revenue from {plData?.totalSalesCount || 0} sales</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Cost of Goods Sold (COGS)</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(plData?.cogs || 0)}</div>
            <p className="text-[11px] text-slate-400 mt-1">FIFO cost basis of sold inventory</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Gross Profit Margin</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(plData?.grossProfit || 0)}</div>
            <p className="text-[11px] text-slate-400 mt-1">Margin: {plData?.grossMarginPercent || 0}%</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Net Profit / Loss</CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(plData?.netProfit || 0) >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {formatCurrency(plData?.netProfit || 0)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Net Margin: {plData?.netMarginPercent || 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Itemized Profitability Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-wrap justify-between items-center bg-slate-50 gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Itemized Product Profitability Breakdown</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLossOnly(false)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                !showLossOnly ? "bg-blue-600 text-white shadow-xs" : "bg-white text-slate-600 border hover:bg-slate-100"
              }`}
            >
              All Sold Items ({itemizedItems.length})
            </button>
            <button
              onClick={() => setShowLossOnly(true)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                showLossOnly ? "bg-rose-600 text-white shadow-xs" : "bg-white text-slate-600 border hover:bg-slate-100"
              }`}
            >
              ⚠️ Loss-Making Items Only ({lossCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Quantity Sold</th>
                <th className="p-3 text-right">Total Revenue</th>
                <th className="p-3 text-right">FIFO COGS Cost</th>
                <th className="p-3 text-right">Gross Profit / Loss</th>
                <th className="p-3 text-right">Margin %</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Calculating itemized profitability...
                  </td>
                </tr>
              ) : filteredBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    {showLossOnly
                      ? "🎉 Great news! No items are currently selling at a loss."
                      : "No sold item records found matching filters."}
                  </td>
                </tr>
              ) : (
                filteredBreakdown.map((item: any) => (
                  <tr key={item.productId} className={`hover:bg-slate-50 ${item.isLoss ? "bg-rose-50/40" : ""}`}>
                    <td className="p-3 font-mono font-semibold text-slate-500">{item.sku}</td>
                    <td className="p-3 font-bold text-slate-900">{item.productName}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[11px]">
                        {item.categoryName}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                      {item.totalQuantitySold} {item.unitAbbr}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(item.totalRevenue)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">
                      {formatCurrency(item.totalCogs)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-extrabold text-sm ${
                        item.isLoss ? "text-rose-700" : "text-blue-700"
                      }`}
                    >
                      {formatCurrency(item.grossProfit)}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-bold ${
                        item.marginPercent >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {item.marginPercent}%
                    </td>
                    <td className="p-3 text-center">
                      {item.isLoss ? (
                        <Badge variant="danger" className="text-[10px] font-bold">
                          ⚠️ LOSS
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px] font-bold">
                          ✓ PROFITABLE
                        </Badge>
                      )}
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
