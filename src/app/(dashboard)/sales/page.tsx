"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableLoader } from "@/components/ui/loader";
import {
  Plus,
  Filter,
  RefreshCw,
  ShoppingCart,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { InvoiceModalWrapper } from "./components/InvoiceModalWrapper";
import { useTranslations } from "next-intl";
import {
  generateSalesSummaryPDF,
  exportSalesSummaryCSV,
  SalesSummaryItem,
} from "@/lib/pdfExport";
import { getCombinedSales } from "@/lib/offline/cacheService";
import { putManyInStore } from "@/lib/offline/db";
import { syncEngine } from "@/lib/offline/syncEngine";

export default function SalesPage() {
  const t = useTranslations("sales");
  const tc = useTranslations("common");

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State
  const [period, setPeriod] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    fetchSales();
  }, [period]);

  useEffect(() => {
    const unsub = syncEngine.subscribe((state) => {
      if (!state.isSyncing) {
        fetchSales();
      }
    });
    return unsub;
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (period !== "all") params.append("period", period);
      if (period === "custom") {
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
      }

      if (typeof navigator !== "undefined" && navigator.onLine) {
        const res = await fetch(`/api/sales?${params.toString()}`);
        if (res.ok) {
          const liveData = await res.json();
          putManyInStore("sales", liveData).catch(() => {});
          const combined = await getCombinedSales(liveData);
          setSales(combined);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Online fetchSales failed, falling back to offline cache:", e);
    }

    // Offline fallback: load cached + pending offline sales
    try {
      const combined = await getCombinedSales([]);
      setSales(combined);
    } catch (err) {
      console.error("Failed to load offline sales:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales();
  };

  const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.grandTotal || 0), 0);
  const totalOutstandingAmount = sales
    .filter((s) => s.buyerId || s.buyer)
    .reduce((sum, s) => sum + Number(s.outstandingAmount || 0), 0);
  const totalPaidAmount = Math.max(0, totalSalesAmount - totalOutstandingAmount);

  // Round Off Audit Statistics
  const totalRoundOffAmount = sales.reduce((sum, s) => sum + Number(s.roundOff || 0), 0);
  const roundOffUpAmount = sales
    .filter((s) => Number(s.roundOff || 0) > 0)
    .reduce((sum, s) => sum + Number(s.roundOff), 0);
  const roundOffDownAmount = sales
    .filter((s) => Number(s.roundOff || 0) < 0)
    .reduce((sum, s) => sum + Number(s.roundOff), 0);
  const roundOffCount = sales.filter((s) => Number(s.roundOff || 0) !== 0).length;

  const getPeriodLabel = (): string => {
    switch (period) {
      case "today":
        return "Today";
      case "this_week":
        return "This Week";
      case "this_month":
        return "This Month";
      case "last_month":
        return "Last Month";
      case "custom":
        return startDate && endDate
          ? `${startDate} to ${endDate}`
          : "Custom Range";
      default:
        return "All Time";
    }
  };

  const prepareSummaryItems = (): SalesSummaryItem[] => {
    return sales.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoiceNumber,
      saleDate: s.saleDate,
      buyerName: s.buyer ? s.buyer.name : "Walk-in Cash Customer",
      branchName: s.branch?.name || "Main Branch",
      cashierName: s.createdBy?.name || "Admin",
      grandTotal: Number(s.grandTotal || 0),
      amountPaid: Number(s.amountPaid || 0),
      outstandingAmount: Number(s.outstandingAmount || 0),
      roundOff: Number(s.roundOff || 0),
      paymentMethod: s.paymentMethod === "BANK_TRANSFER" ? "BANK" : "CASH",
      paymentStatus: s.paymentStatus || "PAID",
    }));
  };

  const handleDownloadPDF = () => {
    const summaryItems = prepareSummaryItems();
    generateSalesSummaryPDF({
      periodLabel: getPeriodLabel(),
      sales: summaryItems,
      totalSales: totalSalesAmount,
      totalPaid: totalPaidAmount,
      totalOutstanding: totalOutstandingAmount,
      totalRoundOff: totalRoundOffAmount,
      storeName: "FATIMA TRADERS",
    });
  };

  const handleDownloadCSV = () => {
    const summaryItems = prepareSummaryItems();
    exportSalesSummaryCSV({
      periodLabel: getPeriodLabel(),
      sales: summaryItems,
      totalSales: totalSalesAmount,
      totalPaid: totalPaidAmount,
      totalOutstanding: totalOutstandingAmount,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-500 text-sm">{t("subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download PDF Button */}
          <Button
            onClick={handleDownloadPDF}
            disabled={sales.length === 0}
            variant="outline"
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs border-slate-300 text-xs h-9 gap-1.5"
            title="Download formatted PDF sales report"
          >
            <FileText className="h-4 w-4 text-rose-600" />
            <span>{t("downloadPdf")}</span>
          </Button>

          {/* Export CSV Button */}
          <Button
            onClick={handleDownloadCSV}
            disabled={sales.length === 0}
            variant="outline"
            className="bg-white hover:bg-slate-50 text-slate-700 font-semibold shadow-xs border-slate-300 text-xs h-9 gap-1.5"
            title="Export sales data to CSV/Excel spreadsheet"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>{t("downloadCsv")}</span>
          </Button>

          {/* New POS Sale */}
          <Link href="/pos">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs text-xs h-9 gap-1.5">
              <Plus className="h-4 w-4" /> {t("newSale")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-900 uppercase">{t("filterTitle")}</span>
          </div>

          {/* Filter Quick Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: t("allTime") },
              { id: "today", label: t("today") },
              { id: "this_week", label: t("thisWeek") },
              { id: "this_month", label: t("thisMonth") },
              { id: "last_month", label: t("lastMonth") },
              { id: "custom", label: t("customRange") },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
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

        {/* Custom Date Form */}
        {period === "custom" && (
          <form onSubmit={handleCustomApply} className="flex flex-wrap items-end gap-3 pt-1">
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">{t("startDate")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs py-1 px-2 bg-slate-50 mt-0.5"
                required
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-600">{t("endDate")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs py-1 px-2 bg-slate-50 mt-0.5"
                required
              />
            </div>
            <Button type="submit" size="sm" className="bg-blue-600 text-white text-xs font-semibold">
              {t("applyDate")}
            </Button>
          </form>
        )}
      </div>

      {/* Sales Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Sales */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">{t("totalSales")}</span>
            <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
              {formatCurrency(totalSalesAmount)}
            </div>
            <span className="text-[11px] text-slate-400">{sales.length} Invoices ({getPeriodLabel()})</span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">{t("totalPaid")}</span>
            <div className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">
              {formatCurrency(totalPaidAmount)}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">Cash & Bank Received</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">{t("totalOutstanding")}</span>
            <div className="text-xl font-extrabold text-rose-600 mt-1 font-mono">
              {formatCurrency(totalOutstandingAmount)}
            </div>
            <span className="text-[11px] text-rose-500 font-medium">Pending Customer Debt</span>
          </div>
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Net Round Off Adjustment */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">{t("netRoundOff")}</span>
            <div
              className={`text-xl font-extrabold mt-1 font-mono ${
                totalRoundOffAmount > 0
                  ? "text-emerald-600"
                  : totalRoundOffAmount < 0
                  ? "text-rose-600"
                  : "text-slate-700"
              }`}
            >
              {totalRoundOffAmount > 0
                ? `+${formatCurrency(totalRoundOffAmount)}`
                : formatCurrency(totalRoundOffAmount)}
            </div>
            <span className="text-[10px] text-slate-400">{t("roundedBillsCount", { count: roundOffCount })}</span>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Calculator className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
              <tr>
                <th className="p-3.5">{t("colInvoice")}</th>
                <th className="p-3.5">{t("colDate")}</th>
                <th className="p-3.5">{t("colBuyer")}</th>
                <th className="p-3.5">{t("colBranch")}</th>
                <th className="p-3.5">{t("colCashier")}</th>
                <th className="p-3.5 text-right">{t("colGrandTotal")}</th>
                <th className="p-3.5 text-right">{t("colRoundOff")}</th>
                <th className="p-3.5 text-right">{t("colPaid")}</th>
                <th className="p-3.5 text-right">{t("colOutstanding")}</th>
                <th className="p-3.5 text-center">{t("colStatus")}</th>
                <th className="p-3.5 text-right">{t("colAction")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <TableLoader colSpan={11} text="Loading sales transactions..." />
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    {t("noSales")}
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-blue-600">{sale.invoiceNumber}</td>
                    <td className="p-3.5 text-slate-500 font-mono whitespace-nowrap">{formatDate(sale.saleDate)}</td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {sale.buyer ? sale.buyer.name : "👤 Walk-in Cash Customer"}
                    </td>
                    <td className="p-3.5 text-slate-600">{sale.branch?.name || "-"}</td>
                    <td className="p-3.5 text-slate-600 font-mono">{sale.createdBy?.name || "Admin"}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(sale.grandTotal)}</td>
                    <td className="p-3.5 text-right font-mono text-xs">
                      {sale.roundOff ? (
                        <span
                          className={`font-semibold ${
                            Number(sale.roundOff) > 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {Number(sale.roundOff) > 0 ? `+${Number(sale.roundOff)}` : Number(sale.roundOff)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono text-emerald-600 font-bold">{formatCurrency(sale.amountPaid)}</td>
                    <td className="p-3.5 text-right font-mono text-rose-600 font-bold">
                      {Number(sale.outstandingAmount) > 0 ? formatCurrency(sale.outstandingAmount) : "-"}
                    </td>
                    <td className="p-3.5 text-center">
                      {sale.isOfflinePending ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] px-2 py-0.5">
                          ⏳ Offline Pending
                        </Badge>
                      ) : (
                        <Badge
                          variant={
                            sale.paymentStatus === "PAID"
                              ? "success"
                              : sale.paymentStatus === "PARTIAL"
                              ? "warning"
                              : "danger"
                          }
                          className="text-[10px] px-2 py-0.5"
                        >
                          {sale.paymentStatus}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <InvoiceModalWrapper sale={sale} saleId={sale.id} />
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
