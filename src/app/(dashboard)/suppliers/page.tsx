"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SupplierFormModal } from "@/components/suppliers/SupplierFormModal";
import { SupplierLedgerModal } from "@/components/suppliers/SupplierLedgerModal";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { Search, Plus, Truck, X, Phone, Building2 } from "lucide-react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
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
    if (!q) return true;
    return (
      s.name?.toLowerCase().includes(q) ||
      s.companyName?.toLowerCase().includes(q) ||
      s.contactNumber?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
    );
  });

  const totalOutstandingPayables = suppliers.reduce(
    (sum, s) => sum + Number(s.outstandingBalance || 0),
    0
  );

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
        <div className="flex items-center space-x-2">
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 font-bold gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> Add Supplier
          </Button>
        </div>
      </div>

      {/* Search Bar & Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search suppliers by name, company, phone number, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-9 text-xs bg-white border-slate-200 shadow-xs h-10 rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="sm:col-span-4 bg-white p-2.5 px-4 rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">Total Payables:</span>
          <span className="text-sm font-extrabold font-mono text-rose-600">
            {formatCurrency(totalOutstandingPayables)}
          </span>
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
                      {search ? `No supplier found matching "${search}"` : "No suppliers found. Click 'Add Supplier' to create one."}
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
