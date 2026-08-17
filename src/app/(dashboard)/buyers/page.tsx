"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TableLoader } from "@/components/ui/loader";
import { Plus, Edit, Trash2, FileText, Search, CreditCard, AlertCircle } from "lucide-react";
import { BuyerFormModal } from "@/components/buyers/BuyerFormModal";
import { BuyerLedgerModal } from "@/components/buyers/BuyerLedgerModal";

export default function BuyersPage() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter");

  const [buyers, setBuyers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
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
    const matchesSearch =
      buyer.name.toLowerCase().includes(search.toLowerCase()) ||
      (buyer.companyName || "").toLowerCase().includes(search.toLowerCase()) ||
      (buyer.contactNumber || "").includes(search);

    if (filterType === "OUTSTANDING") {
      return matchesSearch && Number(buyer.totalOutstanding) > 0;
    }
    return matchesSearch;
  });

  const totalOutstandingSum = buyers.reduce((sum, b) => sum + Number(b.totalOutstanding || 0), 0);
  const debtorsCount = buyers.filter((b) => Number(b.totalOutstanding) > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Buyers & Customer Accounts</h1>
          <p className="text-slate-500 text-sm">Manage customers, view chronological financial ledgers, and settle outstanding receivables.</p>
        </div>
        <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Add New Customer
        </Button>
      </div>

      {/* KPI Receivables Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 uppercase block">Total Outstanding Receivables</span>
            <span className="text-2xl font-bold text-emerald-700">{formatCurrency(totalOutstandingSum)}</span>
          </div>
          <Badge variant="success" className="text-xs font-bold py-1 px-3">
            {debtorsCount} Debtors Outstanding
          </Badge>
        </div>

        {/* Search & Filter Controls */}
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterType === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Customers ({buyers.length})
            </button>
            <button
              onClick={() => setFilterType("OUTSTANDING")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filterType === "OUTSTANDING"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              }`}
            >
              ⚠️ Outstanding Debtors Only ({debtorsCount})
            </button>
          </div>

          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by name, company, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs py-1 h-8"
            />
          </div>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase">
            <tr>
              <th className="p-3.5">Customer Name</th>
              <th className="p-3.5">Company / Firm</th>
              <th className="p-3.5">Contact Number</th>
              <th className="p-3.5">Address</th>
              <th className="p-3.5 text-right">Outstanding (PKR)</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {isLoading ? (
              <TableLoader colSpan={7} text="Loading buyers list..." />
            ) : filteredBuyers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  {filterType === "OUTSTANDING"
                    ? "🎉 No customers currently have outstanding debt!"
                    : "No buyers found."}
                </td>
              </tr>
            ) : (
              filteredBuyers.map((buyer) => (
                <tr key={buyer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">{buyer.name}</td>
                  <td className="p-3.5 text-slate-600">{buyer.companyName || "-"}</td>
                  <td className="p-3.5 text-slate-600 font-mono">{buyer.contactNumber || "-"}</td>
                  <td className="p-3.5 text-slate-600 truncate max-w-[180px]">{buyer.address || "-"}</td>
                  <td
                    className={`p-3.5 text-right font-mono font-bold text-sm ${
                      buyer.totalOutstanding > 0 ? "text-rose-600" : "text-emerald-700"
                    }`}
                  >
                    {formatCurrency(buyer.totalOutstanding)}
                  </td>
                  <td className="p-3.5 text-center">
                    <Badge variant={buyer.isActive ? "success" : "muted"}>
                      {buyer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex justify-end space-x-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLedger(buyer)}
                        className="text-xs bg-slate-50 hover:bg-slate-100"
                        title="View Ledger & Settle"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1 text-blue-600" /> Ledger / Settle
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(buyer)} title="Edit Buyer">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(buyer.id)} title="Delete Buyer">
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

      {isFormOpen && (
        <BuyerFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={fetchBuyers}
          buyer={selectedBuyer}
        />
      )}

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
