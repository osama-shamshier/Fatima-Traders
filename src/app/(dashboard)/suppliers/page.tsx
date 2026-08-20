"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { SupplierLedgerModal } from "@/components/suppliers/SupplierLedgerModal";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { Search, Plus, Truck, X, Download, MapPin } from "lucide-react";
import { generatePartiesPDF } from "@/lib/pdfExport";

export default function SuppliersPage() {
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

    const headers = ["#", "Supplier Name", "Company / Firm", "Contact Number", "Address / Area", "Outstanding Payable (PKR)", "Status"];
    const rows = filteredSuppliers.map((s, index) => [
      index + 1,
      `"${(s.name || "").replace(/"/g, '""')}"`,
      `"${(s.companyName || "").replace(/"/g, '""')}"`,
      `"${(s.contactNumber || "").replace(/"/g, '""')}"`,
      `"${(s.address || "").replace(/"/g, '""')}"`,
      Number(s.outstandingBalance || 0),
      s.isActive !== false ? "Active" : "Inactive",
    ]);

    rows.push(["", '"TOTAL"', "", "", "", totalOutstandingPayables, `"${filteredSuppliers.length} Suppliers"`]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const sanitizedArea = areaSearch.trim() ? `_${areaSearch.trim().replace(/[^a-zA-Z0-9_-]/g, "_")}` : "";
    link.download = `Suppliers_List${sanitizedArea}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-blue-600" /> Suppliers
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage vendor profiles, purchase ledger history, and outstanding payables.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleDownloadCSV}
            variant="outline"
            disabled={filteredSuppliers.length === 0}
            className="bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-semibold shadow-xs gap-1.5"
            title="Download CSV / Excel spreadsheet of the filtered suppliers list"
          >
            <Download className="h-4 w-4 text-blue-600" />
            Export Excel (CSV)
          </Button>
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            disabled={filteredSuppliers.length === 0}
            className="bg-white hover:bg-slate-50 border-slate-300 text-slate-800 font-semibold shadow-xs gap-1.5"
            title="Download PDF report of the filtered suppliers list"
          >
            <Download className="h-4 w-4 text-rose-600" />
            Download PDF
            {areaSearch.trim() ? ` (${filteredSuppliers.length})` : ""}
          </Button>
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 font-bold gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Add Supplier
          </Button>
        </div>
      </div>

      {/* Search Bar & Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-8 bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                filterType === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All ({suppliers.length})
            </button>
            <button
              onClick={() => setFilterType("OUTSTANDING")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                filterType === "OUTSTANDING"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              ⚠️ Outstanding Payables Only ({payablesCount})
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Area Search Bar */}
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-blue-500" />
              <Input
                placeholder="Search by Area / Address (e.g. Shah Alam, Saddar)..."
                value={areaSearch}
                onChange={(e) => setAreaSearch(e.target.value)}
                className="pl-8 pr-7 text-xs py-1 h-8 bg-blue-50/40 border-blue-200 focus:bg-white"
              />
              {areaSearch && (
                <button
                  onClick={() => setAreaSearch("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* General Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by name, company, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-7 text-xs py-1 h-8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="sm:col-span-4 bg-emerald-50/80 p-3.5 px-4 rounded-xl border border-emerald-200 shadow-xs flex justify-between items-center text-xs">
          <div>
            <span className="text-emerald-800 font-semibold block text-[11px] uppercase">
              {areaSearch.trim() ? `Payables in "${areaSearch.trim()}"` : "Total Outstanding Payables"}
            </span>
            <span className="text-xl font-extrabold font-mono text-rose-600">
              {formatCurrency(totalOutstandingPayables)}
            </span>
          </div>
          <Badge variant="success" className="text-xs font-bold py-1 px-2.5">
            {payablesCount} Payables
          </Badge>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <Loader text="Loading suppliers..." className="py-12" />
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="h-11 px-4 text-left align-middle font-bold">Supplier Name</th>
                  <th className="h-11 px-4 text-left align-middle font-bold">Company</th>
                  <th className="h-11 px-4 text-left align-middle font-bold">Contact</th>
                  <th className="h-11 px-4 text-right align-middle font-bold">Outstanding Payable</th>
                  <th className="h-11 px-4 text-center align-middle font-bold">Status</th>
                  <th className="h-11 px-4 text-right align-middle font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 align-middle font-bold text-slate-900">{supplier.name}</td>
                    <td className="p-4 align-middle text-slate-600">{supplier.companyName || "-"}</td>
                    <td className="p-4 align-middle text-slate-600 font-mono">{supplier.contactNumber || "-"}</td>
                    <td className="p-4 align-middle text-right font-extrabold font-mono text-rose-600 text-sm">
                      {formatCurrency(supplier.outstandingBalance || 0)}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <Badge variant={supplier.isActive ? "success" : "muted"} className="text-[11px]">
                        {supplier.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle text-right space-x-1.5 whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewLedger(supplier.id, supplier.name)}
                        className="h-7 text-xs px-2.5 font-semibold text-blue-600 hover:bg-blue-50 border-blue-200"
                      >
                        Ledger
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(supplier)}
                        className="h-7 text-xs px-2.5 font-semibold"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(supplier.id)}
                        className="h-7 text-xs px-2.5 font-semibold"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredSuppliers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-xs text-slate-400">
                      {areaSearch
                        ? `No suppliers found in area "${areaSearch}"`
                        : search
                        ? `No suppliers found matching "${search}"`
                        : filterType === "OUTSTANDING"
                        ? "🎉 No suppliers currently have outstanding payables!"
                        : "No suppliers found. Click 'Add Supplier' to create one."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
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
