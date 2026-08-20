"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { SupplierLedgerModal } from "@/components/suppliers/SupplierLedgerModal";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { Search, Plus, Truck, X, Download, MapPin, Edit, Trash2, FileText } from "lucide-react";
import { generatePartiesPDF } from "@/lib/pdfExport";
import { useTranslations } from "next-intl";

export default function SuppliersPage() {
  const t = useTranslations("suppliers");
  const tc = useTranslations("common");

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "OUTSTANDING">("ALL");
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [ledgerSupplierId, setLedgerSupplierId] = useState("");
  const [ledgerSupplierName, setLedgerSupplierName] = useState("");

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAdd = () => {
    setSelectedSupplier(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSuppliers();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewLedger = (id: string, name: string) => {
    setLedgerSupplierId(id);
    setLedgerSupplierName(name);
    setIsLedgerModalOpen(true);
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.companyName?.toLowerCase().includes(q) ||
      s.contactNumber?.toLowerCase().includes(q);

    const a = areaSearch.toLowerCase().trim();
    const matchesArea = !a || (s.address || "").toLowerCase().includes(a);

    if (filterType === "OUTSTANDING") {
      return matchesSearch && matchesArea && Number(s.outstandingBalance || 0) > 0;
    }
    return matchesSearch && matchesArea;
  });

  const totalOutstandingPayables = filteredSuppliers.reduce(
    (sum, s) => sum + Number(s.outstandingBalance || 0),
    0
  );
  const payablesCount = filteredSuppliers.filter(
    (s) => Number(s.outstandingBalance || 0) > 0
  ).length;

  const handleDownloadPDF = () => {
    const items = filteredSuppliers.map((s) => ({
      name: s.name,
      companyName: s.companyName,
      contactNumber: s.contactNumber,
      address: s.address,
      outstandingAmount: Number(s.outstandingBalance || 0),
      isActive: s.isActive,
    }));

    generatePartiesPDF({
      partyType: "Suppliers",
      areaQuery: areaSearch,
      filterType,
      items,
      totalOutstanding: totalOutstandingPayables,
    });
  };

  const handleDownloadCSV = () => {
    if (filteredSuppliers.length === 0) {
      alert("No suppliers to export.");
      return;
    }

    const headers = [
      "Supplier Name",
      "Company / Firm",
      "Contact Phone",
      "City / Address",
      "Outstanding Payable (PKR)",
      "Status",
    ];

    const rows = filteredSuppliers.map((s) => [
      `"${s.name || ""}"`,
      `"${s.companyName || ""}"`,
      `"${s.contactNumber || ""}"`,
      `"${(s.address || "").replace(/"/g, '""')}"`,
      s.outstandingBalance || 0,
      s.isActive ? "Active" : "Inactive",
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Fatima_Traders_Suppliers_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-600" /> {t("title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCSV}
            className="text-xs font-semibold gap-1.5 bg-white shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Excel (CSV)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="text-xs font-semibold gap-1.5 bg-white shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> PDF
          </Button>
          <Button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t("addSupplier")}
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Toggle Pills */}
        <div className="md:col-span-3 flex gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          <button
            onClick={() => setFilterType("ALL")}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
              filterType === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("allSuppliers")} ({suppliers.length})
          </button>
          <button
            onClick={() => setFilterType("OUTSTANDING")}
            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all ${
              filterType === "OUTSTANDING"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t("payablesOnly")} ({suppliers.filter((s) => Number(s.outstandingBalance || 0) > 0).length})
          </button>
        </div>

        {/* Search Input */}
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

        {/* Area / Address Search Input */}
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
          <span className="text-slate-500 font-semibold">{t("totalPayables")}:</span>
          <span className="text-base font-extrabold font-mono text-rose-600">
            {formatCurrency(totalOutstandingPayables)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">{t("activePayableCount")}:</span>
          <span className="text-base font-extrabold font-mono text-slate-900">
            {payablesCount} {t("allSuppliers")}
          </span>
        </div>
      </div>

      {/* Suppliers Table */}
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
              {loading ? (
                <TableLoader colSpan={7} text="Loading suppliers..." />
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    {search || areaSearch || filterType === "OUTSTANDING"
                      ? t("noSuppliers")
                      : "No suppliers registered yet."}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{supplier.name}</td>
                    <td className="p-4 text-slate-600">{supplier.companyName || "-"}</td>
                    <td className="p-4 font-mono text-slate-600">{supplier.contactNumber || "-"}</td>
                    <td className="p-4 text-slate-500 max-w-xs truncate">{supplier.address || "-"}</td>
                    <td className="p-4 text-right font-extrabold font-mono text-sm">
                      {Number(supplier.outstandingBalance || 0) > 0 ? (
                        <span className="text-rose-600">{formatCurrency(supplier.outstandingBalance)}</span>
                      ) : (
                        <span className="text-emerald-600">Rs. 0</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={supplier.isActive ? "success" : "outline"}>
                        {supplier.isActive ? tc("active") : tc("inactive")}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewLedger(supplier.id, supplier.name)}
                          className="h-7 text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <FileText className="h-3.5 w-3.5 me-1" /> {t("viewLedger")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SupplierFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchSuppliers}
        supplier={selectedSupplier}
      />

      <SupplierLedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        supplierId={ledgerSupplierId}
        supplierName={ledgerSupplierName}
      />
    </div>
  );
}
