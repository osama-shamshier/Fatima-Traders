"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableLoader } from "@/components/ui/loader";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"valuation" | "sales" | "profit-loss">("valuation");
  const [valuationData, setValuationData] = useState<any | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [plData, setPlData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "valuation") fetchValuation();
    else if (activeTab === "sales") fetchSalesReport();
    else if (activeTab === "profit-loss") fetchProfitLoss();
  }, [activeTab]);

  const fetchValuation = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/inventory-valuation");
      if (res.ok) setValuationData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/sales");
      if (res.ok) setSalesData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfitLoss = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/profit-loss");
      if (res.ok) setPlData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = (filename: string, rows: any[]) => {
    if (!rows || !rows.length) return;
    const headers = Object.keys(rows[0]).join(",");
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows.map(r => Object.values(r).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics Hub</h1>
          <p className="text-slate-500 text-sm">FIFO Inventory Valuation, Sales Analytics, and Profit & Loss Financial Statements.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("valuation")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "valuation" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Inventory Valuation (FIFO)
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "sales" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sales Analytics
          </button>
          <button
            onClick={() => setActiveTab("profit-loss")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "profit-loss" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Profit & Loss
          </button>
        </div>
      </div>

      {activeTab === "valuation" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Stock Value (FIFO Cost)</CardTitle>
                <Package className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(valuationData?.totalValuation || 0)}
                </div>
                <p className="text-xs text-slate-400 mt-1">Calculated from unconsumed FIFO inventory layers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Inventory Items</CardTitle>
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">
                  {valuationData?.totalItems || 0} Products
                </div>
                <p className="text-xs text-slate-400 mt-1">Active stock items across all branches</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Product-wise Valuation Breakdown</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV("Inventory_Valuation_FIFO", valuationData?.items || [])}
              >
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-medium text-xs">
                  <tr>
                    <th className="p-4">Product Name</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4">Branch</th>
                    <th className="p-4 text-right">Available Qty</th>
                    <th className="p-4 text-right">Avg Unit Cost</th>
                    <th className="p-4 text-right">Total FIFO Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <TableLoader colSpan={6} text="Loading valuation report..." />
                  ) : (
                    (valuationData?.items || []).map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-4 font-semibold text-slate-900">{item.productName}</td>
                        <td className="p-4 font-mono text-slate-500">{item.sku}</td>
                        <td className="p-4 text-slate-600">{item.branchName}</td>
                        <td className="p-4 text-right font-mono font-bold">{item.quantity}</td>
                        <td className="p-4 text-right font-mono">{formatCurrency(item.avgUnitCost || 0)}</td>
                        <td className="p-4 text-right font-mono font-bold text-blue-700">{formatCurrency(item.fifoValuation || 0)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "profit-loss" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">Total Revenue</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-emerald-600">{formatCurrency(plData?.revenue || 0)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">Cost of Goods Sold (COGS)</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-rose-600">{formatCurrency(plData?.cogs || 0)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">Gross Profit</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-blue-600">{formatCurrency(plData?.grossProfit || 0)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">Net Profit</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${(plData?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(plData?.netProfit || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Profit & Loss Income Statement</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b font-medium">
                <span>Gross Revenue (Sales)</span>
                <span className="font-bold text-emerald-600">{formatCurrency(plData?.revenue || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b font-medium text-rose-600">
                <span>Less: Cost of Goods Sold (FIFO Cost Basis)</span>
                <span className="font-bold">({formatCurrency(plData?.cogs || 0)})</span>
              </div>
              <div className="flex justify-between py-2 border-b font-bold text-base bg-slate-50 p-2 rounded">
                <span>Gross Margin / Gross Profit</span>
                <span className="text-blue-700">{formatCurrency(plData?.grossProfit || 0)}</span>
              </div>
              <div className="flex justify-between py-2 border-b font-medium text-rose-600">
                <span>Less: Operating Expenses (Rent, Salaries, Utilities)</span>
                <span className="font-bold">({formatCurrency(plData?.expenses || 0)})</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-slate-900 font-extrabold text-lg bg-emerald-50 p-3 rounded-xl">
                <span>NET OPERATING PROFIT</span>
                <span className={(plData?.netProfit || 0) >= 0 ? "text-emerald-700" : "text-rose-700"}>
                  {formatCurrency(plData?.netProfit || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
