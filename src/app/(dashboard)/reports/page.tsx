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

export default function ReportsPage() {
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
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows.map(r => Object.values(r).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredParties = partyList.filter((item) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name?.toLowerCase().includes(q) ||
      (item.companyName || "").toLowerCase().includes(q) ||
      (item.contactNumber || "").includes(q);

    const a = areaSearch.toLowerCase().trim();
    const matchesArea = !a || (item.address || "").toLowerCase().includes(a);

    const outstanding = partyType === "Customers"
      ? Number(item.totalOutstanding || 0)
      : Number(item.outstandingBalance || 0);

    if (filterType === "OUTSTANDING") {
      return matchesSearch && matchesArea && outstanding > 0;
    }
    return matchesSearch && matchesArea;
  });

  const totalOutstanding = filteredParties.reduce((sum, item) => {
    const amt = partyType === "Customers"
      ? Number(item.totalOutstanding || 0)
      : Number(item.outstandingBalance || 0);
    return sum + amt;
  }, 0);

  const handleDownloadPartiesPDF = () => {
    const items = filteredParties.map((item) => ({
      name: item.name,
      companyName: item.companyName,
      contactNumber: item.contactNumber,
      address: item.address,
      outstandingAmount: partyType === "Customers"
        ? Number(item.totalOutstanding || 0)
        : Number(item.outstandingBalance || 0),
      isActive: item.isActive,
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
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics Hub</h1>
          <p className="text-slate-500 text-sm">FIFO Inventory Valuation, Sales Analytics, Profit & Loss, and Area-wise Balances.</p>
        </div>

        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab("valuation")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "valuation" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Inventory Valuation (FIFO)
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "sales" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sales Analytics
          </button>
          <button
            onClick={() => setActiveTab("profit-loss")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "profit-loss" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setActiveTab("area-balances")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "area-balances" ? "bg-white text-blue-700 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📍 Area & Balance Reports
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

      {activeTab === "area-balances" && (
        <div className="space-y-6">
          {/* Party Type & Balance Filter Header Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setPartyType("Customers")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    partyType === "Customers"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Customers (Receivables)
                </button>
                <button
                  onClick={() => setPartyType("Suppliers")}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
                    partyType === "Suppliers"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" /> Suppliers (Payables)
                </button>
              </div>

              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <button
                  onClick={() => setFilterType("ALL")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filterType === "ALL"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All ({partyList.length})
                </button>
                <button
                  onClick={() => setFilterType("OUTSTANDING")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filterType === "OUTSTANDING"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                  }`}
                >
                  ⚠️ Outstanding Only
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPartiesPDF}
                disabled={filteredParties.length === 0}
                className="bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-semibold gap-1.5"
              >
                <Download className="w-4 h-4 text-rose-600" /> Download PDF ({filteredParties.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const rows = filteredParties.map((p, idx) => ({
                    No: idx + 1,
                    Name: p.name,
                    Company: p.companyName || "",
                    Contact: p.contactNumber || "",
                    Address_Area: p.address || "",
                    Remaining_Amount: partyType === "Customers" ? p.totalOutstanding : p.outstandingBalance,
                    Status: p.isActive ? "Active" : "Inactive",
                  }));
                  exportCSV(`${partyType}_Area_Report`, rows);
                }}
                disabled={filteredParties.length === 0}
                className="bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-semibold gap-1.5"
              >
                <Download className="w-4 h-4 text-blue-600" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Area & Search Input Bar + Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8 bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5">
              {/* Area Search */}
              <div className="relative flex-1">
                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-blue-500" />
                <Input
                  placeholder="Filter by Area / Address (e.g. Gulberg, Saddar, Model Town)..."
                  value={areaSearch}
                  onChange={(e) => setAreaSearch(e.target.value)}
                  className="pl-8 pr-7 text-xs h-9 bg-blue-50/30 border-blue-200 focus:bg-white"
                />
                {areaSearch && (
                  <button
                    onClick={() => setAreaSearch("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* General Search */}
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, company, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-7 text-xs h-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 px-4 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
                  {areaSearch.trim() ? `Total for "${areaSearch.trim()}"` : `Total Remaining ${partyType === "Customers" ? "Receivables" : "Payables"}`}
                </span>
                <span className="text-xl font-extrabold text-emerald-700">
                  {formatCurrency(totalOutstanding)}
                </span>
              </div>
              <Badge variant="success" className="text-xs font-bold py-1 px-3">
                {filteredParties.length} {partyType}
              </Badge>
            </div>
          </div>

          {/* Area Filtered Parties Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b font-bold uppercase">
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">{partyType === "Customers" ? "Customer Name" : "Supplier Name"}</th>
                    <th className="p-3.5">Company / Firm</th>
                    <th className="p-3.5">Contact Number</th>
                    <th className="p-3.5">Address / Area</th>
                    <th className="p-3.5 text-right">
                      {partyType === "Customers" ? "Outstanding Receivable (PKR)" : "Outstanding Payable (PKR)"}
                    </th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <TableLoader colSpan={7} text={`Loading ${partyType.toLowerCase()} list...`} />
                  ) : filteredParties.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        {areaSearch
                          ? `No ${partyType.toLowerCase()} found in area "${areaSearch}"`
                          : search
                          ? `No ${partyType.toLowerCase()} found matching "${search}"`
                          : filterType === "OUTSTANDING"
                          ? `🎉 No ${partyType.toLowerCase()} currently have outstanding balances!`
                          : `No ${partyType.toLowerCase()} found.`}
                      </td>
                    </tr>
                  ) : (
                    filteredParties.map((party, idx) => {
                      const outstanding = partyType === "Customers"
                        ? Number(party.totalOutstanding || 0)
                        : Number(party.outstandingBalance || 0);

                      return (
                        <tr key={party.id || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3.5 font-bold text-slate-900">{party.name}</td>
                          <td className="p-3.5 text-slate-600">{party.companyName || "-"}</td>
                          <td className="p-3.5 text-slate-600 font-mono">{party.contactNumber || "-"}</td>
                          <td className="p-3.5 text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                              {party.address || "-"}
                            </span>
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold text-sm ${
                              outstanding > 0 ? "text-rose-600" : "text-emerald-700"
                            }`}
                          >
                            {formatCurrency(outstanding)}
                          </td>
                          <td className="p-3.5 text-center">
                            <Badge variant={party.isActive ? "success" : "muted"}>
                              {party.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredParties.length > 0 && (
                  <tfoot className="bg-slate-50 border-t font-bold text-slate-900">
                    <tr>
                      <td colSpan={5} className="p-3.5 text-right uppercase text-xs">
                        Total Remaining Amount:
                      </td>
                      <td className="p-3.5 text-right font-mono text-base font-extrabold text-rose-600">
                        {formatCurrency(totalOutstanding)}
                      </td>
                      <td className="p-3.5 text-center text-xs text-slate-500">
                        {filteredParties.length} records
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
