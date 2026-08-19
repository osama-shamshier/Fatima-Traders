"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ui/loader";
import { PurchaseCreateModal } from "@/components/purchases/PurchaseCreateModal";
import { PurchaseViewModal } from "@/components/purchases/PurchaseViewModal";
import { Search, Plus, ShoppingBag, X, Eye } from "lucide-react";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const fetchPurchases = async () => {
    try {
      const res = await fetch("/api/purchases");
      if (res.ok) {
        const data = await res.json();
        setPurchases(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleAdd = () => {
    setIsCreateModalOpen(true);
  };

  const handleView = (id: string) => {
    setSelectedPurchaseId(id);
    setIsViewModalOpen(true);
  };

  const filteredPurchases = purchases.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.invoiceNumber?.toLowerCase().includes(q) ||
      p.supplier?.name?.toLowerCase().includes(q) ||
      p.supplier?.companyName?.toLowerCase().includes(q) ||
      p.branch?.name?.toLowerCase().includes(q) ||
      p.paymentStatus?.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "ALL" || p.paymentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPurchasesAmount = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
  const totalOutstandingPurchases = purchases.reduce((sum, p) => sum + Number(p.outstandingAmount || 0), 0);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-blue-600" /> Purchases
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track purchase orders, supplier bills, FIFO inventory batch restocking, and payables.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 font-bold gap-1.5 shadow-sm">
            <Plus className="w-4 h-4" /> New Purchase Bill
          </Button>
        </div>
      </div>

      {/* Search Bar & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-7 relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search purchases by invoice #, supplier name, branch..."
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

        {/* Status Filter Pills */}
        <div className="sm:col-span-5 flex gap-1.5 overflow-x-auto justify-start sm:justify-end">
          {[
            { id: "ALL", label: "All Bills" },
            { id: "PAID", label: "Paid" },
            { id: "PARTIAL", label: "Partial" },
            { id: "PENDING", label: "Pending" },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                statusFilter === pill.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">Total Purchases:</span>
          <span className="text-sm font-extrabold font-mono text-slate-900">
            {formatCurrency(totalPurchasesAmount)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">Outstanding Payables:</span>
          <span className="text-sm font-extrabold font-mono text-rose-600">
            {formatCurrency(totalOutstandingPurchases)}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex justify-between items-center text-xs">
          <span className="text-slate-500 font-semibold">Total Bills Count:</span>
          <span className="text-sm font-extrabold font-mono text-blue-700">
            {purchases.length} Bills
          </span>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <Loader text="Loading purchases..." className="py-12" />
        ) : (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase">
                <tr>
                  <th className="h-11 px-4 text-left align-middle font-bold">Date</th>
                  <th className="h-11 px-4 text-left align-middle font-bold">Invoice #</th>
                  <th className="h-11 px-4 text-left align-middle font-bold">Supplier</th>
                  <th className="h-11 px-4 text-left align-middle font-bold">Branch</th>
                  <th className="h-11 px-4 text-right align-middle font-bold">Total</th>
                  <th className="h-11 px-4 text-right align-middle font-bold">Paid</th>
                  <th className="h-11 px-4 text-right align-middle font-bold">Outstanding</th>
                  <th className="h-11 px-4 text-center align-middle font-bold">Status</th>
                  <th className="h-11 px-4 text-right align-middle font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 align-middle whitespace-nowrap text-slate-600">
                      {formatDate(purchase.purchaseDate)}
                    </td>
                    <td className="p-4 align-middle font-mono font-bold text-blue-600">
                      {purchase.invoiceNumber}
                    </td>
                    <td className="p-4 align-middle font-bold text-slate-900">
                      {purchase.supplier?.name}
                      {purchase.supplier?.companyName && (
                        <span className="text-[10px] text-slate-400 font-normal block">
                          {purchase.supplier.companyName}
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-slate-600">{purchase.branch?.name}</td>
                    <td className="p-4 align-middle text-right font-extrabold font-mono text-slate-900 text-sm">
                      {formatCurrency(purchase.totalAmount)}
                    </td>
                    <td className="p-4 align-middle text-right text-emerald-600 font-mono font-bold">
                      {formatCurrency(purchase.amountPaid)}
                    </td>
                    <td className="p-4 align-middle text-right text-rose-600 font-mono font-bold">
                      {formatCurrency(purchase.outstandingAmount)}
                    </td>
                    <td className="p-4 align-middle text-center">
                      <Badge
                        variant={
                          purchase.paymentStatus === "PAID"
                            ? "success"
                            : purchase.paymentStatus === "PARTIAL"
                            ? "warning"
                            : "danger"
                        }
                        className="text-[11px]"
                      >
                        {purchase.paymentStatus}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(purchase.id)}
                        className="h-7 text-xs px-2.5 font-semibold text-blue-600 hover:bg-blue-50 border-blue-200 gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredPurchases.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-xs text-slate-400">
                      {search || statusFilter !== "ALL"
                        ? "No purchases found matching current filters."
                        : "No purchases found. Click 'New Purchase Bill' to create one."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PurchaseCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchPurchases}
      />

      <PurchaseViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        purchaseId={selectedPurchaseId}
      />
    </div>
  );
}
