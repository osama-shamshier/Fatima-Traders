"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableLoader } from "@/components/ui/loader";
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Package, MapPin, Search, X, Users, Truck } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { generatePartiesPDF } from "@/lib/pdfExport";
import { useTranslations } from "next-intl";

export default function ReportsPage() {
  const t = useTranslations("reports");
  const tc = useTranslations("common");

  const [activeTab, setActiveTab] = useState<"valuation" | "sales" | "profit-loss" | "area-balances">("valuation");
  const [valuationData, setValuationData] = useState<any | null>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [plData, setPlData] = useState<any | null>(null);
  const [partyType, setPartyType] = useState<"Customers" | "Suppliers">("Customers");
  const [partyList, setPartyList] = useState<any[]>([]);
  const [areaSearch, setAreaSearch] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "OUTSTANDING">("ALL");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeTab === "valuation") fetchValuation();
    else if (activeTab === "sales") fetchSalesReport();
    else if (activeTab === "profit-loss") fetchProfitLoss();
    else if (activeTab === "area-balances") fetchPartyList();
  }, [activeTab, partyType]);

  const fetchPartyList = async () => {
    setIsLoading(true);
    try {
      const endpoint = partyType === "Customers" ? "/api/buyers" : "/api/suppliers";
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setPartyList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

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
    const csvContent = "\uFEFF" + [headers, ...rows.map(r => Object.values(r).map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredParties = partyList.filter((item) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name?.toLowerCase().includes(q) ||
      item.companyName?.toLowerCase().includes(q) ||
      item.contactNumber?.toLowerCase().includes(q);

    const a = areaSearch.toLowerCase().trim();
    const matchesArea = !a || (item.address || "").toLowerCase().includes(a);

    const outBal = Number(partyType === "Customers" ? item.totalOutstanding : item.outstandingBalance || 0);

    if (filterType === "OUTSTANDING") {
      return matchesSearch && matchesArea && outBal > 0;
    }
    return matchesSearch && matchesArea;
  });

  const totalOutstanding = filteredParties.reduce(
    (sum, p) => sum + Number(partyType === "Customers" ? p.totalOutstanding : p.outstandingBalance || 0),
    0
  );

  const handleDownloadPDF = () => {
    const items = filteredParties.map((p) => ({
      name: p.name,
      companyName: p.companyName,
      contactNumber: p.contactNumber,
      address: p.address,
      outstandingAmount: Number(partyType === "Customers" ? p.totalOutstanding : p.outstandingBalance || 0),
      isActive: p.isActive,
    }));

    generatePartiesPDF({
      partyType,
      areaQuery: areaSearch,
      filterType,
      items,
      totalOutstanding,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {[
          { id: "valuation", label: t("tabValuation") },
          { id: "sales", label: t("tabSales") },
          { id: "profit-loss", label: t("tabProfitLoss") },
          { id: "area-balances", label: t("tabAreaBalances") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Valuation */}
      {activeTab === "valuation" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 text-xs font-bold uppercase">{t("totalValuation")}</span>
                <div className="text-2xl font-black font-mono text-blue-600 mt-1">
                  {formatCurrency(valuationData?.totalValuation || 0)}
                </div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 text-xs font-bold uppercase">{t("totalStockUnits")}</span>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                  {valuationData?.totalUnits?.toLocaleString() || 0}
                </div>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-slate-500 text-xs font-bold uppercase">{t("totalBranchesCount")}</span>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                  {valuationData?.branches?.length || 0}
                </div>
              </div>
            </div>
            <div className="ms-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV("inventory-valuation-report", valuationData?.branches || [])}
                className="text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5 me-1 text-emerald-600" /> {t("exportExcel")}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="relative w-full overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase">
                  <tr>
                    <th className="p-3.5">{t("colBranch")}</th>
                    <th className="p-3.5 text-center">{t("colProductCount")}</th>
                    <th className="p-3.5 text-center">{t("colTotalUnits")}</th>
                    <th className="p-3.5 text-right">{t("colFifoValuation")}</th>
                    <th className="p-3.5 text-right">{t("colAvgUnitCost")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <TableLoader colSpan={5} text="Calculating valuation..." />
                  ) : (
                    valuationData?.branches?.map((b: any) => (
                      <tr key={b.branchId} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-slate-900">{b.branchName}</td>
                        <td className="p-3.5 text-center font-mono">{b.productCount}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-900">{b.totalQuantity}</td>
                        <td className="p-3.5 text-right font-mono font-black text-blue-600 text-sm">
                          {formatCurrency(b.totalValuation)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-slate-600">
                          {formatCurrency(b.totalQuantity > 0 ? b.totalValuation / b.totalQuantity : 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sales */}
      {activeTab === "sales" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCSV("sales-performance-report", salesData)}
              className="text-xs font-semibold"
            >
              <Download className="w-3.5 h-3.5 me-1 text-emerald-600" /> {t("exportExcel")}
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="relative w-full overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase">
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Branch</th>
                    <th className="p-3.5 text-right">Grand Total</th>
                    <th className="p-3.5 text-right">Amount Paid</th>
                    <th className="p-3.5 text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <TableLoader colSpan={7} text="Loading sales reports..." />
                  ) : (
                    salesData.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-mono font-bold text-blue-600">{s.invoiceNumber}</td>
                        <td className="p-3.5 text-slate-500 font-mono">{formatDate(s.saleDate)}</td>
                        <td className="p-3.5 font-bold text-slate-900">{s.buyer?.name || "Walk-in"}</td>
                        <td className="p-3.5 text-slate-600">{s.branch?.name}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(s.grandTotal)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-emerald-600">{formatCurrency(s.amountPaid)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-rose-600">{formatCurrency(s.outstandingAmount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Profit Loss */}
      {activeTab === "profit-loss" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-xs font-bold uppercase">Net Sales Revenue</span>
              <div className="text-xl font-black font-mono text-emerald-600 mt-1">{formatCurrency(plData?.netRevenue || 0)}</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-xs font-bold uppercase">FIFO COGS</span>
              <div className="text-xl font-black font-mono text-orange-600 mt-1">{formatCurrency(plData?.totalCOGS || 0)}</div>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-xs font-bold uppercase">Operating Expenses</span>
              <div className="text-xl font-black font-mono text-rose-600 mt-1">{formatCurrency(plData?.operatingExpenses || 0)}</div>
            </div>
            <div className="p-4 bg-slate-900 text-white rounded-xl shadow-xs">
              <span className="text-slate-400 text-xs font-bold uppercase">Net Profit</span>
              <div className="text-xl font-black font-mono text-emerald-400 mt-1">{formatCurrency(plData?.netProfit || 0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Area Balances (Khata) */}
      {activeTab === "area-balances" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setPartyType("Customers")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    partyType === "Customers" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" /> {t("customerToggle")}
                </button>
                <button
                  onClick={() => setPartyType("Suppliers")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                    partyType === "Suppliers" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 text-emerald-600" /> {t("supplierToggle")}
                </button>
              </div>

              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setFilterType("ALL")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${filterType === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}`}
                >
                  All ({partyList.length})
                </button>
                <button
                  onClick={() => setFilterType("OUTSTANDING")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${filterType === "OUTSTANDING" ? "bg-rose-600 text-white shadow-xs" : "text-slate-500"}`}
                >
                  With Balances
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(`${partyType.toLowerCase()}-area-report`, filteredParties)}
                className="text-xs font-semibold gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> {t("exportExcel")}
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPDF}
                className="text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> {t("exportPdf")}
              </Button>
            </div>
          </div>

          {/* Search Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute start-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9 text-xs bg-white"
              />
            </div>
            <div className="relative">
              <MapPin className="absolute start-3 top-2.5 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t("areaPlaceholder")}
                value={areaSearch}
                onChange={(e) => setAreaSearch(e.target.value)}
                className="ps-9 text-xs bg-white"
              />
            </div>
          </div>

          {/* Summary Metric */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">{t("totalOutstandingBal")}:</span>
            <span className="text-lg font-black font-mono text-rose-600">{formatCurrency(totalOutstanding)}</span>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="relative w-full overflow-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase">
                  <tr>
                    <th className="p-3.5">{partyType === "Customers" ? "Customer" : "Supplier"}</th>
                    <th className="p-3.5">Company</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Address / City</th>
                    <th className="p-3.5 text-right">Outstanding Balance</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <TableLoader colSpan={6} text="Loading parties..." />
                  ) : filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No party accounts found.
                      </td>
                    </tr>
                  ) : (
                    filteredParties.map((p) => {
                      const outBal = Number(partyType === "Customers" ? p.totalOutstanding : p.outstandingBalance || 0);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-3.5 font-bold text-slate-900">{p.name}</td>
                          <td className="p-3.5 text-slate-600">{p.companyName || "-"}</td>
                          <td className="p-3.5 font-mono text-slate-600">{p.contactNumber || "-"}</td>
                          <td className="p-3.5 text-slate-500 max-w-xs truncate">{p.address || "-"}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-sm">
                            {outBal > 0 ? (
                              <span className="text-rose-600">{formatCurrency(outBal)}</span>
                            ) : (
                              <span className="text-emerald-600">Rs. 0</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <Badge variant={p.isActive ? "success" : "outline"} className="text-[10px]">
                              {p.isActive ? tc("active") : tc("inactive")}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
