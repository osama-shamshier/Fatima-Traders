"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Filter, RefreshCw, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { InvoiceModalWrapper } from "./components/InvoiceModalWrapper";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State
  const [period, setPeriod] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    fetchSales();
  }, [period]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== "all") params.append("period", period);
      if (period === "custom") {
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
      }

      const res = await fetch(`/api/sales?${params.toString()}`);
      if (res.ok) {
        setSales(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch sales", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales();
  };

  const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
  const totalPaidAmount = sales.reduce((sum, s) => sum + Number(s.amountPaid || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Transactions & Invoice Log</h1>
          <p className="text-slate-500 text-sm">View sales orders, customer invoice statuses, and filter by date periods.</p>
        </div>
        <Link href="/pos">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm shrink-0">
            <Plus className="mr-2 h-4 w-4" /> New Sale (POS)
          </Button>
        </Link>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase">Date Range Filter</span>
          </div>

          {/* Filter Quick Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "custom", label: "Custom Range" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  period === p.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs if Custom Selected */}
        {period === "custom" && (
          <form onSubmit={handleCustomApply} className="flex flex-wrap items-end gap-3 pt-1">
            <div>
              <Label className="text-xs font-semibold">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1 px-2.5 mt-1 bg-slate-50"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1 px-2.5 mt-1 bg-slate-50"
              />
            </div>
            <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Apply Custom Range
            </Button>
          </form>
        )}

        {/* Filter Summary Stats */}
        <div className="flex flex-wrap justify-between items-center text-xs font-semibold text-slate-600 pt-1">
          <span>Showing {sales.length} sale order(s)</span>
          <div className="flex gap-4 font-mono">
            <span className="text-slate-900">Total Sales: <strong className="text-blue-700">{formatCurrency(totalSalesAmount)}</strong></span>
            <span className="text-slate-900">Total Collected: <strong className="text-emerald-700">{formatCurrency(totalPaidAmount)}</strong></span>
          </div>
        </div>
      </div>

      {/* Sales Orders Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Date & Time</th>
                <th className="p-3.5">Branch</th>
                <th className="p-3.5">Customer Name</th>
                <th className="p-3.5 text-right">Grand Total</th>
                <th className="p-3.5 text-right">Amount Paid</th>
                <th className="p-3.5 text-center">Payment Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No sales orders found for the selected period.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-600">{sale.invoiceNumber}</td>
                    <td className="p-3.5 font-mono text-slate-600">{formatDate(sale.createdAt || sale.saleDate)}</td>
                    <td className="p-3.5 text-slate-800 font-semibold">{sale.branch?.name || "Main Branch"}</td>
                    <td className="p-3.5 font-bold text-slate-900">{sale.buyer?.name || "Walk-in Customer"}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(Number(sale.grandTotal))}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600">
                      {formatCurrency(Number(sale.amountPaid))}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge
                        variant={
                          sale.paymentStatus === "PAID"
                            ? "success"
                            : sale.paymentStatus === "PARTIAL"
                            ? "warning"
                            : "danger"
                        }
                        className="text-[10px] font-bold"
                      >
                        {sale.paymentStatus}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <InvoiceModalWrapper saleId={sale.id} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
