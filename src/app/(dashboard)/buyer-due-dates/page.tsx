"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableLoader } from "@/components/ui/loader";
import { Calendar, Filter, RefreshCw, FileText, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { BuyerLedgerModal } from "@/components/buyers/BuyerLedgerModal";

export default function BuyerDueDatesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [period, setPeriod] = useState<string>("due_today");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Ledger Modal
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  useEffect(() => {
    fetchDueDates();
  }, [period]);

  const fetchDueDates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== "all") params.append("period", period);
      if (search) params.append("search", search);
      if (period === "custom") {
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
      }

      const res = await fetch(`/api/buyers/due-dates?${params.toString()}`);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch due dates", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDueDates();
  };

  const handleOpenLedger = (item: any) => {
    setSelectedBuyer({ id: item.buyerId, name: item.buyerName });
    setIsLedgerOpen(true);
  };

  const totalOutstandingAmount = items.reduce((sum, i) => sum + Number(i.outstandingAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Credit Payment Due Dates</h1>
          <p className="text-slate-500 text-sm">Monitor credit bills due today, overdue collections, and schedule customer settlements.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDueDates}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Due Schedule
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase">Collection Schedule Period</span>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "due_today", label: "📅 Due Today", badgeColor: "bg-amber-600 text-white" },
              { id: "overdue", label: "⚠️ Overdue Bills", badgeColor: "bg-rose-600 text-white" },
              { id: "this_week", label: "📆 This Week" },
              { id: "this_month", label: "🗓️ This Month" },
              { id: "all", label: "All Credit Sales" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  period === p.id
                    ? p.badgeColor || "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Custom Inputs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search by customer name, company, or invoice #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchDueDates()}
              className="text-xs bg-slate-50"
            />
          </div>

          {period === "custom" && (
            <form onSubmit={handleCustomApply} className="flex flex-wrap items-end gap-2">
              <div>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs py-1 px-2 bg-slate-50"
                />
              </div>
              <div>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs py-1 px-2 bg-slate-50"
                />
              </div>
              <Button type="submit" size="sm" className="bg-blue-600 text-white text-xs font-semibold">
                Apply Date
              </Button>
            </form>
          )}

          <div className="text-xs font-semibold text-slate-700 font-mono">
            Pending Credit Total: <strong className="text-rose-600 font-bold text-sm">{formatCurrency(totalOutstandingAmount)}</strong>
          </div>
        </div>
      </div>

      {/* Due Dates Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Customer Name</th>
                <th className="p-3.5">Company / Phone</th>
                <th className="p-3.5">Sale Date</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Outstanding Credit</th>
                <th className="p-3.5 text-center">Payment Due Date</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <TableLoader colSpan={9} text="Loading payment due dates..." />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                    No credit sales found for the selected period matching filters.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.status === "OVERDUE" ? "bg-rose-50/40" : item.status === "DUE TODAY" ? "bg-amber-50/40" : ""}`}>
                    <td className="p-3.5 font-mono font-bold text-blue-600">{item.invoiceNumber}</td>
                    <td className="p-3.5 font-bold text-slate-900">{item.buyerName}</td>
                    <td className="p-3.5 text-slate-600 font-mono">
                      {item.companyName ? `${item.companyName} (${item.contactNumber || "-"})` : item.contactNumber || "-"}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">{formatDate(item.saleDate)}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(item.grandTotal)}</td>
                    <td className="p-3.5 text-right font-mono font-extrabold text-rose-600 text-sm">
                      {formatCurrency(item.outstandingAmount)}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-slate-900">
                      {item.dueDate ? formatDate(item.dueDate) : "No Due Date"}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.status === "DUE TODAY" ? (
                        <Badge variant="warning" className="text-[10px] font-bold">
                          📅 DUE TODAY
                        </Badge>
                      ) : item.status === "OVERDUE" ? (
                        <Badge variant="danger" className="text-[10px] font-bold">
                          ⚠️ OVERDUE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold text-blue-700 border-blue-300">
                          ⌛ UPCOMING
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {item.buyerId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenLedger(item)}
                          className="text-xs bg-slate-50 hover:bg-slate-100"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 text-blue-600" /> Settle / Ledger
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Walk-in</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isLedgerOpen && selectedBuyer && (
        <BuyerLedgerModal
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
          buyerId={selectedBuyer.id}
          buyerName={selectedBuyer.name}
          onSuccess={fetchDueDates}
        />
      )}
    </div>
  );
}
