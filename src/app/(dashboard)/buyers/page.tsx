"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { Plus, Edit, Trash2, FileText, Search, Download, MapPin, X, Users } from "lucide-react";
import { BuyerFormModal } from "@/components/buyers/BuyerFormModal";
import { BuyerLedgerModal } from "@/components/buyers/BuyerLedgerModal";
import { generatePartiesPDF } from "@/lib/pdfExport";
import { useTranslations } from "next-intl";

export default function BuyersPage() {
  const t = useTranslations("buyers");
  const tc = useTranslations("common");

  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter");

  const [buyers, setBuyers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "OUTSTANDING">(
    initialFilter === "outstanding" ? "OUTSTANDING" : "ALL"
  );
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);

  const fetchBuyers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/buyers");
      const data = await res.json();
      setBuyers(data);
    } catch (error) {
      console.error("Failed to fetch buyers", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const handleAdd = () => {
    setSelectedBuyer(null);
    setIsFormOpen(true);
  };

  const handleEdit = (buyer: any) => {
    setSelectedBuyer(buyer);
    setIsFormOpen(true);
  };

  const handleLedger = (buyer: any) => {
    setSelectedBuyer(buyer);
    setIsLedgerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this buyer?")) return;

    try {
      const res = await fetch(`/api/buyers/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchBuyers();
      }
    } catch (error) {
      console.error("Failed to delete buyer", error);
    }
  };

  const filteredBuyers = buyers.filter((buyer) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      buyer.name?.toLowerCase().includes(q) ||
      (buyer.companyName || "").toLowerCase().includes(q) ||
      (buyer.contactNumber || "").includes(q);

    const a = areaSearch.toLowerCase().trim();
    const matchesArea = !a || (buyer.address || "").toLowerCase().includes(a);

    if (filterType === "OUTSTANDING") {
      return matchesSearch && matchesArea && Number(buyer.totalOutstanding) !== 0;
    }
    return matchesSearch && matchesArea;
  });

  const totalOutstandingSum = filteredBuyers.reduce((sum, b) => sum + Number(b.totalOutstanding || 0), 0);
  const debtorsCount = filteredBuyers.filter((b) => Number(b.totalOutstanding) !== 0).length;

  const handleDownloadPDF = () => {
    const items = filteredBuyers.map((b) => ({
      name: b.name,
      companyName: b.companyName,
      contactNumber: b.contactNumber,
      address: b.address,
      outstandingAmount: Number(b.totalOutstanding) || 0,
    }));

    generatePartiesPDF({
      partyType: "Customers",
      areaQuery: areaSearch,
      filterType: filterType,
      items,
      totalOutstanding: totalOutstandingSum,
      storeName: "FATIMA TRADERS",
    });
  };

  const handleExportCSV = () => {
    if (filteredBuyers.length === 0) {
      alert("No customers to export.");
      return;
    }

    const headers = ["Customer Name", "Company / Shop", "Contact Phone", "City / Address", "Outstanding Balance (PKR)"];
    const rows = filteredBuyers.map((b) => [
      `"${b.name || ""}"`,
      `"${b.companyName || ""}"`,
      `"${b.contactNumber || ""}"`,
      `"${(b.address || "").replace(/"/g, '""')}"`,
      b.totalOutstanding || 0,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Fatima_Traders_Customers_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 pt-6 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs font-semibold gap-1.5 bg-white shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> {t("exportCsv")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="text-xs font-semibold gap-1.5 bg-white shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> {t("downloadPdf")}
          </Button>
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> {t("addBuyer")}
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search & Area Filter */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Toggle Pills: All vs Outstanding */}
        <div className="md:col-span-3 flex gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          <button
            onClick={() => setFilterType("ALL")}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
              filterType === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("allBuyers")} ({buyers.length})
          </button>
          <button
            onClick={() => setFilterType("OUTSTANDING")}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
              filterType === "OUTSTANDING"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("debtorsOnly")} ({buyers.filter((b) => Number(b.totalOutstanding) > 0).length})
          </button>
        </div>

        {/* Customer Search Bar */}
        <div className="md:col-span-5 relative">
          <Search className="absolute start-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10 pe-9 text-xs bg-white border-slate-200 shadow-xs h-10 rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute end-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Area / Address Search Filter */}
        <div className="md:col-span-4 relative">
          <MapPin className="absolute start-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t("areaFilterPlaceholder")}
            value={areaSearch}
            onChange={(e) => setAreaSearch(e.target.value)}
            className="ps-10 pe-9 text-xs bg-white border-slate-200 shadow-xs h-10 rounded-xl"
          />
          {areaSearch && (
            <button
              onClick={() => setAreaSearch("")}
              className="absolute end-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">{t("totalReceivables")}:</span>
          <span className="text-base font-extrabold font-mono text-rose-600">
            {formatCurrency(totalOutstandingSum)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">{t("activeDebtors")}:</span>
          <span className="text-base font-extrabold font-mono text-slate-900">
            {debtorsCount} {t("allBuyers")}
          </span>
        </div>
      </div>

      {/* Buyers Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 border-b font-bold uppercase">
              <tr>
                <th className="h-11 px-4">{t("colName")}</th>
                <th className="h-11 px-4">{t("colCompany")}</th>
                <th className="h-11 px-4">{t("colContact")}</th>
                <th className="h-11 px-4">{t("colAddress")}</th>
                <th className="h-11 px-4 text-right">{t("colOutstanding")}</th>
                <th className="h-11 px-4">{t("colStatus")}</th>
                <th className="h-11 px-4 text-right">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <TableLoader colSpan={7} text="Loading customers..." />
              ) : filteredBuyers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {search || areaSearch || filterType === "OUTSTANDING"
                      ? t("noBuyers")
                      : "No customers registered in the system yet."}
                  </td>
                </tr>
              ) : (
                filteredBuyers.map((buyer) => {
                  const outstanding = Number(buyer.totalOutstanding || 0);

                  return (
                    <tr key={buyer.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{buyer.name}</td>
                      <td className="p-4 text-slate-600">{buyer.companyName || "-"}</td>
                      <td className="p-4 font-mono text-slate-600">{buyer.contactNumber || "-"}</td>
                      <td className="p-4 text-slate-500 max-w-xs truncate">{buyer.address || "-"}</td>
                      <td className="p-4 text-right font-extrabold font-mono text-sm">
                        {outstanding > 0 ? (
                          <span className="text-rose-600">{formatCurrency(outstanding)}</span>
                        ) : outstanding < 0 ? (
                          <span className="text-emerald-600 font-bold">{formatCurrency(outstanding)}</span>
                        ) : (
                          <span className="text-slate-400 font-medium">Rs. 0</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={buyer.isActive ? "success" : "outline"}>
                          {buyer.isActive ? tc("active") : tc("inactive")}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLedger(buyer)}
                            className="h-7 text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <FileText className="h-3.5 w-3.5 me-1" /> {t("viewLedger")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(buyer)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                            onClick={() => handleDelete(buyer.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <BuyerFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchBuyers}
        buyer={selectedBuyer}
      />

      {isLedgerOpen && selectedBuyer && (
        <BuyerLedgerModal
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
          buyerId={selectedBuyer.id}
          buyerName={selectedBuyer.name}
          onSuccess={fetchBuyers}
        />
      )}
    </div>
  );
}
